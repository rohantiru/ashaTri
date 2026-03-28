// One-time script to delete a user and all their Firestore data.
// Usage:
//   1. Download a service account key from Firebase Console →
//      Project Settings → Service Accounts → Generate new private key
//   2. Save it as serviceAccount.json in this directory (already in .gitignore)
//   3. npm install firebase-admin   (or: npx --yes firebase-admin)
//   4. node delete-user.js

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

const TARGET_EMAIL = 'aparnavelampudi@gmail.com'
const LIST_USERS = false // set to false once you find the right UID
const DELETE_SECRET_UID = 'aVfEUDHrY7RhVelYDtpeDRUno4A3' // set to '' to skip

const serviceAccount = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const db = admin.firestore()
const auth = admin.auth()

async function run() {
  if (DELETE_SECRET_UID) {
    await db.doc(`userSecrets/${DELETE_SECRET_UID}`).delete()
    console.log(`Deleted userSecrets/${DELETE_SECRET_UID}`)
    return
  }

  if (LIST_USERS) {
    const [usersSnap, secretsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('userSecrets').get(),
    ])

    const userMap = {}
    usersSnap.forEach(d => { userMap[d.id] = { email: d.data().email ?? '(no email)', name: d.data().name ?? '' } })

    console.log('\n── users collection ──')
    usersSnap.forEach(d => console.log(` ${d.id}  ${userMap[d.id].email}  ${userMap[d.id].name}`))

    console.log('\n── userSecrets collection ──')
    secretsSnap.forEach(d => {
      const u = userMap[d.id]
      const label = u ? `${u.email}  ${u.name}` : '(no matching user doc)'
      const data = d.data()
      const hasStrava = !!(data.stravaAccessToken || data.access_token)
      console.log(` ${d.id}  ${label}  strava=${hasStrava}`)
    })
    return
  }

  // 1. Resolve UID from email (Auth first, then Firestore fallback)
  let uid
  try {
    const userRecord = await auth.getUserByEmail(TARGET_EMAIL)
    uid = userRecord.uid
    console.log(`Found user: ${uid} (${TARGET_EMAIL})`)
  } catch (e) {
    console.warn('Not in Firebase Auth, checking Firestore users collection...')
    const usersSnap = await db.collection('users').where('email', '==', TARGET_EMAIL).get()
    if (usersSnap.empty) {
      console.error('No user found in Auth or Firestore for', TARGET_EMAIL)
      process.exit(1)
    }
    uid = usersSnap.docs[0].id
    console.log(`Found via Firestore: ${uid} (${TARGET_EMAIL})`)
  }

  const batch = db.batch()
  let opCount = 0

  const add = (ref) => { batch.delete(ref); opCount++ }

  // 2. Top-level docs keyed by uid
  add(db.doc(`users/${uid}`))
  add(db.doc(`userSecrets/${uid}`))
  add(db.doc(`racePermissions/${uid}`))
  add(db.doc(`athleteStats/${uid}`))

  // 3. stravaCache — subcollection or top-level docs with uid field
  const stravaCacheSnap = await db.collection('stravaCache')
    .where('uid', '==', uid).get()
  stravaCacheSnap.forEach(d => add(d.ref))
  // Also try uid-prefixed doc IDs (pattern: `${uid}_${year}_${month}`)
  const allCacheSnap = await db.collection('stravaCache').get()
  allCacheSnap.forEach(d => { if (d.id.startsWith(uid)) add(d.ref) })

  // 4. raceRegistrations
  const regsSnap = await db.collection('raceRegistrations')
    .where('athleteId', '==', uid).get()
  regsSnap.forEach(d => add(d.ref))

  // 5. expenses
  const expensesSnap = await db.collection('expenses')
    .where('athleteId', '==', uid).get()
  expensesSnap.forEach(d => add(d.ref))

  // 6. swagResponses
  const swagSnap = await db.collection('swagResponses')
    .where('athleteId', '==', uid).get()
  swagSnap.forEach(d => add(d.ref))

  // 7. teams — remove uid from memberIds array
  const teamsSnap = await db.collection('teams').get()
  teamsSnap.forEach(d => {
    const memberIds = d.data().memberIds || []
    if (memberIds.includes(uid)) {
      batch.update(d.ref, {
        memberIds: admin.firestore.FieldValue.arrayRemove(uid),
      })
      opCount++
      console.log(`  Removing from team: ${d.data().name}`)
    }
  })

  console.log(`\nDeleting/updating ${opCount} Firestore operations...`)
  await batch.commit()
  console.log('Firestore data deleted.')

  // 8. Delete Firebase Auth account
  await auth.deleteUser(uid)
  console.log('Firebase Auth account deleted.')

  console.log(`\nDone. ${TARGET_EMAIL} has been fully removed.`)
}

run().catch(e => { console.error(e); process.exit(1) })
