// functions/index.js - optional housekeeping for Forge (Firebase Cloud Functions, 2nd gen)
const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

// If your Realtime Database is NOT in the US, name its region and instance here, e.g.
// const WHERE = { region: "asia-southeast1", instance: "YOUR-PROJECT-default-rtdb" };
const WHERE = {};

// 1. Alert: write a note whenever a reading is above 40 degrees C.
exports.temperatureAlert = onValueCreated({ ref: "/users/{uid}/readings/{ts}", ...WHERE }, async (event) => {
  const reading = event.data.val();
  if (reading && reading.temperature > 40) {
    await db.ref(`/users/${event.params.uid}/alerts/${event.params.ts}`).set({
      temperature: reading.temperature,
      message: "Temperature above 40 C"
    });
  }
});

// 2. Audit trail: remember every change of the bulb command.
exports.bulbAudit = onValueWritten({ ref: "/users/{uid}/bulb", ...WHERE }, async (event) => {
  await db.ref(`/users/${event.params.uid}/audit`).push({
    bulb: event.data.after.val(),
    at: admin.database.ServerValue.TIMESTAMP
  });
});

// 3. Archive: once a day, move readings older than 30 days to /archive.
exports.archiveOldReadings = onSchedule("every 24 hours", async () => {
  const cutoff = String(Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60);
  const users = await db.ref("/users").once("value");
  const jobs = [];
  users.forEach((user) => {
    jobs.push((async () => {
      const old = await db.ref(`/users/${user.key}/readings`).orderByKey().endAt(cutoff).once("value");
      const updates = {};
      old.forEach((row) => {
        updates[`/users/${user.key}/archive/${row.key}`] = row.val();
        updates[`/users/${user.key}/readings/${row.key}`] = null;
      });
      if (Object.keys(updates).length) await db.ref().update(updates);
    })());
  });
  await Promise.all(jobs);
});
