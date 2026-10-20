
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri || !dbName) {
  throw new Error("MONGODB_URI and MONGODB_DB must be configured in .env.local");
}

const testUsers = [
  { username: "student1", email: "student1@example.com", role: "Student" },
  { username: "student2", email: "student2@example.com", role: "Student" },
  { username: "student3", email: "student3@example.com", role: "Student" },
  { username: "teacher1", email: "teacher1@example.com", role: "Teacher" },
  { username: "teacher2", email: "teacher2@example.com", role: "Teacher" },
  { username: "teacher3", email: "teacher3@example.com", role: "Teacher" },
];

const password = "ExamTest123!";
const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const users = db.collection("users");
  const passwordHash = await bcrypt.hash(password, 12);

  await users.createIndex({ email: 1 }, { unique: true });

  for (const user of testUsers) {
    await users.updateOne(
      { email: user.email },
      {
        $setOnInsert: {
          ...user,
          password: passwordHash,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`Checked: ${user.email}`);
  }

  console.log("Test accounts are ready.");
} catch (error) {
  console.error("Seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
