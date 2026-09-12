# INIP Security Specification & Audit

## 1. Data Invariants
1. Organization cases and sub-collections can only be accessed by authenticated users belonging to the authorized institution.
2. An involved entity, diligence, file, payment, or connection cannot exist without a valid parent case document.
3. Activity log / audit records are append-only and cannot be updated or deleted by standard investigators.
4. Concluded cases (`status == 'concluido'`) can only be modified, concluded, or reopened by administrators (`isAdmin()`).
5. Financial payment adjustments and confidential case contract totals can only be updated with valid numeric boundaries.
6. The user email from runtime (`jairosenna14@gmail.com`) is bootstrapped as a super-admin.

## 2. Dirty Dozen Threat Vectors & Negative Testing Matrix
- `D1_SPOOF_UID`: Creating a case claiming to be created by another investigator's UID.
- `D2_REASSIGN_ORG`: Tampering with document paths to hijack organization boundaries.
- `D3_JUNK_ID_POISONING`: Attempting to inject a >128-byte dirty document ID.
- `D4_OVERSIZE_PAYLOAD`: Submitting a case description larger than 5,000 characters.
- `D5_TERMINAL_MUTATION`: Modifying an already completed case without admin status.
- `D6_AUDIT_LOG_DELETE`: Attempting to delete or clear the audit activity log.
- `D7_PII_UNAUTHENTICATED`: Querying involved citizen profiles without active authentication.
- `D8_NEGATIVE_FINANCES`: Inserting negative monetary values into contracted or received values.
- `D9_INVALID_INVOLVED_TYPE`: Creating an involved entity with an unverified type or classification.
- `D10_GHOST_FIELD_UPDATE`: Injecting undeclared privilege escalation fields into user profiles.
- `D11_SELF_ROLE_PROMOTION`: A viewer setting their own role to 'admin'.
- `D12_ORPHANED_CONNECTION`: Adding connection edges referencing non-existent involved nodes.
