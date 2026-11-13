const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore if unsupported
}

const mongoUri = process.env.MONGO_DB;

let isConnected = false;
let connectionPromise = null;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  if (connectionPromise) return connectionPromise;
  try {
    isConnected = false;
    if (!mongoUri) throw new Error("MONGO_DB is not configured");
    connectionPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    await connectionPromise;
    isConnected = true;
    console.log("MongoDB connected successfully for subscribers");
  } catch (err) {
    isConnected = false;
    console.error("Subscriber database connection failed:", err.message);
    throw err;
  } finally {
    connectionPromise = null;
  }
}

connectMongo();

// Define Subscriber Schema
const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["active", "unsubscribed"], default: "active" },
    source: { type: String, default: "ServiceCTA" },
  },
  { timestamps: true }
);

const SubscriberModel =
  mongoose.models.Subscriber || mongoose.model("Subscriber", subscriberSchema);

/**
 * Add a new subscriber. Existing records, including unsubscribed records,
 * must follow the existing consent workflow and are never reactivated here.
 */
async function addSubscriber(email, source = "ServiceCTA") {
  const normalizedEmail = email.toLowerCase().trim();
  await connectMongo();
  const existing = await SubscriberModel.findOne({ email: normalizedEmail }).lean();
  if (existing) return { id: existing._id.toString(), isNew: false };

  try {
    const doc = await SubscriberModel.create({ email: normalizedEmail, status: "active", source });
    return { id: doc._id.toString(), isNew: true };
  } catch (err) {
    // Concurrent requests can both pass the read above; the unique index wins.
    if (err && err.code === 11000) {
      const duplicate = await SubscriberModel.findOne({ email: normalizedEmail }).lean();
      if (duplicate) return { id: duplicate._id.toString(), isNew: false };
    }
    throw err;
  }
}

/**
 * Get all active subscribers
 */
async function getAllActiveSubscribers() {
  await connectMongo();
  const docs = await SubscriberModel.find({ status: "active" }).lean();
  return docs.map((doc) => ({
      id: doc._id.toString(),
      email: doc.email,
      status: doc.status,
      source: doc.source,
      createdAt: doc.createdAt,
  }));
}

/**
 * Get all subscribers (admin view)
 */
async function getAllSubscribers() {
  await connectMongo();
  const docs = await SubscriberModel.find().sort({ createdAt: -1 }).lean();
  return docs.map((doc) => ({
      id: doc._id.toString(),
      email: doc.email,
      status: doc.status,
      source: doc.source,
      createdAt: doc.createdAt,
  }));
}

/**
 * Unsubscribe email
 */
async function unsubscribe(email) {
  const normalizedEmail = email.toLowerCase().trim();
  await connectMongo();
  const res = await SubscriberModel.findOneAndUpdate(
      { email: normalizedEmail },
      { status: "unsubscribed" },
      { new: true }
  );
  return !!res;
}

module.exports = {
  addSubscriber,
  getAllActiveSubscribers,
  getAllSubscribers,
  unsubscribe,
};
