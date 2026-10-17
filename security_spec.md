# Security Specification & Test Matrix

## 1. Data Invariants
- Default Deny: All undefined paths and unauthorized operations are strictly forbidden (`allow read, write: if false;`).
- Authentication: All operational collections (`/students/{studentId}`, `/attendance/{attendanceId}`, `/school_config/{configId}`) require authenticated sessions (`isSignedIn()`).
- Path Variable Hardening: All document IDs must be validated via `isValidId()` matching `^[a-zA-Z0-9_\-]+$` and length <= 128.
- Schema Integrity: Writes must strictly validate required fields, permitted types, size boundaries, and forbid shadow fields via `hasOnly()` checks.
- Immutability: Identifier keys (`id`, `nis`, `studentId`) must not change upon update (`incoming().id == existing().id`).

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Unauthenticated Student Read**: Anonymous user attempts to read `/students/std-1` -> Denied.
2. **Unauthenticated Student Write**: Anonymous user attempts to insert a record into `/students/std-bad` -> Denied.
3. **Invalid Student ID Injection**: Document ID containing path traversal characters `/students/../../malicious` -> Denied by `isValidId`.
4. **Student Shadow Field Injection**: Writing student record with ghost field `{ id: "1", nis: "1001", nama: "A", kelas: "X", no_wa_ortu: "0812", isAdmin: true }` -> Denied by `hasOnly`.
5. **Student Missing Required Field**: Inserting student without `no_wa_ortu` -> Denied by `hasAll`.
6. **Student String Size Overflow**: Student with name exceeding length limit (> 150 chars) -> Denied by boundary check.
7. **Attendance Unauthenticated Creation**: Unauthenticated client attempts to create attendance log -> Denied.
8. **Attendance Invalid Enum/Status**: Attendance log with invalid status or giant string -> Denied.
9. **Attendance ID Path Poisoning**: Attendance doc ID with 2KB string -> Denied by `isValidId`.
10. **School Config Anonymous Overwrite**: Anonymous user attempts to update `/school_config/main` -> Denied.
11. **School Config Oversized Name**: School name exceeding 200 characters -> Denied by size bounds.
12. **Catch-All Subpath Breach**: Attempt to write to arbitrary collection `/admin_secrets/passwords` -> Denied by default-deny rule.
