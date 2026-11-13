require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  if (!process.env.MONGO_DB) throw new Error("MONGO_DB is not configured");
  await mongoose.connect(process.env.MONGO_DB);
  const collection = mongoose.connection.collection("subscribers");

  const invalidEmailCount = await collection.countDocuments({ email: { $not: { $type: "string" } } });
  if (invalidEmailCount) {
    console.error(`${invalidEmailCount} subscriber records have no string email; review them manually before indexing.`);
    process.exitCode = 1;
    return;
  }

  const duplicates = await collection.aggregate([
    { $group: { _id: { $toLower: { $trim: { input: "$email" } } }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  if (duplicates.length) {
    console.error("Duplicate subscriber emails need manual review before creating the unique index:");
    for (const duplicate of duplicates) {
      console.error(`${duplicate._id}: ${duplicate.count} records (${duplicate.ids.join(", ")})`);
    }
    process.exitCode = 1;
    return;
  }

  // Canonicalize formatting only after proving normalization creates no collisions.
  await collection.updateMany(
    { email: { $type: "string" } },
    [{ $set: { email: { $toLower: { $trim: { input: "$email" } } } } }]
  );
  await collection.createIndex({ email: 1 }, { unique: true, name: "email_1" });
  console.log("Subscriber email values normalized and unique index ensured.");
}

main()
  .catch((error) => {
    console.error("Could not ensure subscriber email uniqueness:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
