import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "wad_final_exam";

if (!uri) {
  console.error("MONGODB_URI is missing from .env.local");
  process.exit(1);
}

const users = [
  ["Student One", "student1@example.com", "Student"],
  ["Student Two", "student2@example.com", "Student"],
  ["Student Three", "student3@example.com", "Student"],
  ["Teacher One", "teacher1@example.com", "Teacher"],
  ["Teacher Two", "teacher2@example.com", "Teacher"],
  ["Teacher Three", "teacher3@example.com", "Teacher"],
];

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

try {
  await client.connect();

  const db = client.db(dbName);
  const collection = db.collection("users");

  await collection.createIndex({ email: 1 }, { unique: true });

  for (const [username, email, role] of users) {
    const password = await bcrypt.hash("ExamTest123!", 12);

    await collection.updateOne(
      { email },
      {
        $setOnInsert: {
          username,
          email,
          password,
          role,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`Checked: ${email}`);
  }

  console.log("Finished. Existing accounts were preserved.");
} catch (error) {
  console.error("Insertion failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
