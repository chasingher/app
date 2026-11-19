import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf-8')
);

test('Firestore rules enforce Eight Pillars and deny all Dirty Dozen attack vectors', () => {
  // 1. Default deny catch-all exists
  assert.ok(rulesText.includes('match /{document=**}'));
  assert.ok(rulesText.includes('allow read, write: if false;'));

  // 2. Email verification requirement enforced
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));

  // 3. Strict ID validation regex and length limit
  assert.ok(rulesText.includes("id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$')"));

  // 4. Strict key validation and ownerId match on create/update
  assert.ok(rulesText.includes('data.ownerId == request.auth.uid'));
  assert.ok(rulesText.includes('incoming().ownerId == existing().ownerId'));
  assert.ok(rulesText.includes('incoming().createdAt == existing().createdAt'));
  assert.ok(rulesText.includes('incoming().createdAt == request.time'));
  assert.ok(rulesText.includes('incoming().updatedAt == request.time'));

  // 5. Storage quota boundary check (50 MB max per project/asset)
  assert.ok(rulesText.includes('data.storedBytes >= 0 && data.storedBytes <= 52428800'));

  // 6. Every collection path in firebase-blueprint.json has a matching rule block
  for (const collectionPath of Object.keys(blueprint.firestore)) {
    assert.ok(
      rulesText.includes(`match ${collectionPath}`),
      `Missing match block for ${collectionPath}`
    );
  }
});
