# Additional Verification Guide

This feature lets members upload supporting documents and complete a questionnaire so compliance can review additional verification details. Admins can configure questionnaires, view submissions, and download uploaded files.

## Storage & Limits

- Files live in MongoDB GridFS under the `additionalVerificationFiles` bucket.
- Accepted types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`.
- Maximum size: 10 MB per file, max 5 files per submission.
- GridFS metadata keeps `userId` so only the uploader (or admins) can access a file.

## Backend Overview

| Path | Description |
| --- | --- |
| `backend/services/gridfs.service.js` | Helper for uploading/downloading documents via GridFS |
| `backend/models/additional-verification-questionnaire.model.js` | Questionnaire schema with field definitions |
| `backend/models/additional-verification-submission.model.js` | Stores submissions, answers, and document metadata |
| `backend/controllers/additional-verification*.controller.js` | User/admin endpoints |
| `backend/routes/additional-verification.routes.js` | Express router registered under `/additional-verification` |

### Key Endpoints

- `POST /additional-verification/upload` – upload a single document (multipart). Returns file metadata (`fileId`, `filename`, `mimeType`, `size`).
- `POST /additional-verification` – submit questionnaire answers plus file ids and profile details.
- `GET /additional-verification/my` – user submissions history.
- `GET /additional-verification/files/:fileId` – user downloads their own file.
- Admin endpoints under `/additional-verification/admin/**` include:
  - `questionnaires` CRUD
  - `submissions` list/detail/status
  - `files/:fileId` streaming access

All endpoints require `Authorization: Bearer <token>`.

## Frontend Skeleton

- `frontend/src/pages/AdditionalVerification.tsx`: minimal upload + questionnaire form using the new APIs. Styling is intentionally light so the frontend team can finish it.
- `frontend/src/pages/AdminAdditionalVerification.tsx`: simple questionnaire builder and submissions panel with download + status controls.
- Routes were added in `frontend/src/App.tsx`, and `AdminNavigation` now links to the admin page.
- A feature flag keeps the UI hidden by default so designers can iterate safely. Set `VITE_SHOW_ADDITIONAL_VERIFICATION_UI=true` in `frontend/.env` (or deployment env vars) to expose the user/admin pages and navigation links.

## Manual QA Checklist

1. Log in as a regular user and visit `/additional-verification`.
2. Upload a JPEG/PDF (<10 MB) and ensure it appears in the document list.
3. Fill the profile/questionnaire and submit; check entry appears in “Previous submissions”.
4. Attempt to submit without required fields → expect validation errors.
5. Log in as admin and open `/admin/additional-verification`.
6. Confirm questionnaire list loads and saving a new questionnaire works with valid JSON.
7. Verify submissions table shows the user submission and download links work.
8. Update a submission status (e.g., approved) and ensure it reflects immediately.
9. Try downloading a file via the user endpoint from a different account → should be denied.

## Testing

`backend/test/additional-verification.test.js` includes lightweight validation tests that stub questionnaire logic. Run with:

```bash
cd backend
node test/additional-verification.test.js
```

> Note: Tests only cover validation helpers; full integration tests require a Mongo/GridFS test instance and are out of scope for now.

