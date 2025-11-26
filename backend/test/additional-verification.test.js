import assert from 'assert/strict';
import { validateAnswers, validateDocumentsPayload } from '../utils/additional-verification.utils.js';

const mockQuestionnaire = {
    fields: [
        { key: 'fullName', label: 'Full Name', required: true },
        { key: 'country', label: 'Country', required: true },
        { key: 'notes', label: 'Notes', required: false }
    ]
};

const runValidateAnswersTest = () => {
    const { errors, normalizedAnswers } = validateAnswers(mockQuestionnaire, [
        { fieldKey: 'fullName', value: 'Jane Doe' },
        { fieldKey: 'notes', value: 'Testing' }
    ]);

    assert.equal(errors.length, 1, 'Missing required field should raise an error');
    assert.equal(normalizedAnswers.length, 3, 'All questionnaire fields should be represented');
    assert.equal(normalizedAnswers[0].value, 'Jane Doe');
};

const runValidateDocumentsPayloadTest = () => {
    const { errors, normalizedDocuments } = validateDocumentsPayload([
        { fileId: '507f1f77bcf86cd799439011', filename: 'doc.pdf', mimeType: 'application/pdf', size: 1000 }
    ]);

    assert.equal(errors.length, 0, 'Valid payload should not throw errors');
    assert.equal(normalizedDocuments[0].filename, 'doc.pdf');

    const { errors: missingIdErrors } = validateDocumentsPayload([{ filename: 'doc.pdf' }]);
    assert.ok(missingIdErrors.length > 0, 'Missing fileId should be reported');
};

const main = () => {
    runValidateAnswersTest();
    runValidateDocumentsPayloadTest();
    console.log('Additional verification utils tests passed ✅');
};

main();

