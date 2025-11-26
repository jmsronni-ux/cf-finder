const MAX_DOCUMENTS = 5;

export const normalizeAnswers = (questionnaire, answers = []) => {
    const answerMap = new Map();

    answers.forEach(answer => {
        if (answer && answer.fieldKey) {
            answerMap.set(answer.fieldKey, answer.value);
        }
    });

    const normalized = questionnaire.fields.map(field => ({
        fieldKey: field.key,
        value: answerMap.has(field.key) ? answerMap.get(field.key) : null
    }));

    return normalized;
};

export const validateAnswers = (questionnaire, answers = []) => {
    const normalized = normalizeAnswers(questionnaire, answers);
    const errors = [];

    questionnaire.fields.forEach(field => {
        const entry = normalized.find(item => item.fieldKey === field.key);
        if (field.required && (!entry || entry.value === null || entry.value === '')) {
            errors.push(`Field "${field.label}" is required.`);
        }
    });

    return { errors, normalizedAnswers: normalized };
};

export const validateDocumentsPayload = (documents = []) => {
    if (!Array.isArray(documents)) {
        return { errors: ['Documents payload must be an array'] };
    }

    if (documents.length > MAX_DOCUMENTS) {
        return { errors: [`Maximum of ${MAX_DOCUMENTS} documents allowed`] };
    }

    const errors = [];
    const normalized = documents.map(doc => {
        if (!doc || !doc.fileId) {
            errors.push('Each document must include fileId');
        }

        return {
            fileId: doc.fileId,
            filename: doc.filename,
            mimeType: doc.mimeType,
            size: doc.size
        };
    });

    return { errors, normalizedDocuments: normalized };
};

export const MAX_DOCUMENT_COUNT = MAX_DOCUMENTS;

