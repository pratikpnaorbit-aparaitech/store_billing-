# Security Operations

Report suspected vulnerabilities privately to the deploying company's security or engineering contact. Do not include credentials, customer records, or exploit details in a public issue.

Production secrets belong only in Render/EAS dashboards or approved company secret management. Never commit `.env`, MongoDB credentials, JWT secrets, Cloudinary secrets, SMTP passwords, signing keys, or service-account files.

Rotate credentials immediately after suspected exposure, revoke active service tokens, review application/database logs, preserve evidence, and notify the responsible company owner. Back up MongoDB with database-native tools and regularly test restoration.
