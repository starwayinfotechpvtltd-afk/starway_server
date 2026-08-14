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

async function connectMongo() {
  if (isConnected) return;
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully for Subscribers");
  } catch (err) {
    console.warn("⚠️ MongoDB connection error:", err.message);
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

// In-memory fallback if MongoDB connection is pending or offline
const memorySubscribers = [];
let memoryIdCounter = 1;

/**
 * Add or reactivate a subscriber
 */
async function addSubscriber(email, source = "ServiceCTA") {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    await connectMongo();
    const existing = await SubscriberModel.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.status !== "active") {
        existing.status = "active";
        await existing.save();
      }
      return { id: existing._id.toString(), isNew: false };
    }
    const doc = await SubscriberModel.create({
      email: normalizedEmail,
      status: "active",
      source,
    });
    return { id: doc._id.toString(), isNew: true };
  } catch (err) {
    console.warn("Using in-memory subscriber store due to Mongo error:", err.message);
    const existing = memorySubscribers.find((s) => s.email === normalizedEmail);
    if (existing) {
      existing.status = "active";
      return { id: existing.id, isNew: false };
    }
    const newSub = {
      id: String(memoryIdCounter++),
      email: normalizedEmail,
      status: "active",
      source,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memorySubscribers.push(newSub);
    return { id: newSub.id, isNew: true };
  }
}

/**
 * Get all active subscribers
 */
async function getAllActiveSubscribers() {
  try {
    await connectMongo();
    const docs = await SubscriberModel.find({ status: "active" }).lean();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      email: doc.email,
      status: doc.status,
      source: doc.source,
      createdAt: doc.createdAt,
    }));
  } catch (err) {
    return memorySubscribers.filter((s) => s.status === "active");
  }
}

/**
 * Get all subscribers (admin view)
 */
async function getAllSubscribers() {
  try {
    await connectMongo();
    const docs = await SubscriberModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      email: doc.email,
      status: doc.status,
      source: doc.source,
      createdAt: doc.createdAt,
    }));
  } catch (err) {
    return memorySubscribers;
  }
}

/**
 * Unsubscribe email
 */
async function unsubscribe(email) {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    await connectMongo();
    const res = await SubscriberModel.findOneAndUpdate(
      { email: normalizedEmail },
      { status: "unsubscribed" },
      { new: true }
    );
    return !!res;
  } catch (err) {
    const sub = memorySubscribers.find((s) => s.email === normalizedEmail);
    if (sub) {
      sub.status = "unsubscribed";
      return true;
    }
    return false;
  }
}

module.exports = {
  addSubscriber,
  getAllActiveSubscribers,
  getAllSubscribers,
  unsubscribe,
};
