# Security Specification — Phase 0: Payload-First Security TDD

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every unlisted collection or document path is denied by default (`allow read, write: if false`).
2. **Verified Identity**: All writes require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Strict Path ID & Key Validation**: Document IDs must match `^[a-zA-Z0-9_\-]+$` (<= 128 chars). All `create` and `update` payloads must pass `isValid[Entity](incoming())` enforcing strict `hasAll` / `hasOnly` key sets, string length limits, and numeric boundaries (`storedBytes >= 0 && storedBytes <= 52428800`).
4. **Ownership & Immutability**: `ownerId` and `createdAt` are immutable after document creation (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`).
5. **Temporal Integrity**: `createdAt` on create and `updatedAt` on update must equal `request.time`.
6. **Secure List Queries**: `allow list` rules explicitly restrict `resource.data.ownerId == request.auth.uid` (or `isAdmin()`), never delegating filtering to the client.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection**: Adding `isVerified: true` to `/projects/{projectId}` on create -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Create**: Creating `/projects/{projectId}` where `ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: Writing to `/projects/{projectId}` with `request.auth.token.email_verified == false` -> `PERMISSION_DENIED`.
4. **Path ID Poisoning**: Creating `/projects/{projectId}` with a 200-char or special-char ID -> `PERMISSION_DENIED`.
5. **Owner Hijack on Update**: Updating `ownerId` on `/projects/{projectId}` -> `PERMISSION_DENIED`.
6. **Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a client-chosen past timestamp (`!= request.time`) -> `PERMISSION_DENIED`.
7. **Quota Overflow / Value Poisoning**: Setting `storedBytes` to `-100` or `9999999999` (> 50 MB) -> `PERMISSION_DENIED`.
8. **String Length Exhaustion**: Setting `letter_body` to > 10,000 characters -> `PERMISSION_DENIED`.
9. **Unauthorized List Scraping**: Listing `/projects` without `resource.data.ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
10. **Cross-Tenant Media Record Read**: Reading `/media_records/{recordId}` belonging to another `ownerId` -> `PERMISSION_DENIED`.
11. **Self-Assigned Admin Privilege**: Non-admin user creating `/admins/{uid}` -> `PERMISSION_DENIED`.
12. **Immutable Creation Timestamp Mutation**: Changing `createdAt` during an `update` on `/projects/{projectId}` -> `PERMISSION_DENIED`.
