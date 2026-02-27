# Security & Compliance Design: FinTech Microservice

## 1. Secure CI/CD Pipeline
Our pipeline follows the "Shift Left" security philosophy:

### 1.1 Static Analysis (SAST)
*   Integrate **SonarQube** or **Snyk** in the build phase to detect vulnerabilities in code.
*   Blocking build if "High" or "Critical" vulnerabilities are found.

### 1.2 Dynamic Analysis (DAST)
*   Automated **OWASP ZAP** scans against the staging environment after deployment.
*   Focuses on injection, XSS, and broken authentication.

### 1.3 Secrets Scanning
*   **gitleaks** or **trufflehog** integrated into pre-commit hooks and CI steps to prevent hardcoded credentials from reaching the repository.

### 1.4 SBOM Generation
*   Using **Syft** or **CycloneDX** to generate a Bill of Materials for every container image.
*   Scan SBOMs against vulnerability databases using **Gripe**.

## 2. Infrastructure & Access Control

### 2.1 IAM Design
*   **Principle of Least Privilege**: Each microservice has its own unique IAM Role (via IAM Roles for Service Accounts - IRSA).
*   Fine-grained permissions: The User Service can ONLY access its specific DynamoDB table and S3 bucket.

### 2.2 Service-to-Service mTLS
*   Implementation using **Istio** or **Linkerd** service mesh.
*   Automated certificate management (rotation every 24 hours).
*   Zero-trust architecture: Every request must be authenticated and encrypted.

## 3. Compliance & Logging

### 3.1 PCI-DSS Requirements
*   **Data Masking**: Sensitive fields (PAN, CVV) are never logged.
*   **Encryption at Rest**: AWS KMS with CMKs (Customer Managed Keys) for all databases.
*   **Access Logs**: Detailed logs of who accessed cardholder data environment (CDE).

### 3.2 Audit Log Structure (PMLA Compliance)
As per the Prevention of Money Laundering Act (PMLA), we maintain a rigid audit log structure:
*   `timestamp`: ISO8601 UTC.
*   `user_id`: Unique identifier of the actor.
*   `action`: (e.g., DEPOSIT, WITHDRAW, KYC_VERIFY).
*   `source_ip`: IP address of the request.
*   `change_diff`: JSON blob with Before/After state (excluding PII).
*   `request_id`: For end-to-end traceability.
*   **Retention**: Logs are immutable and stored in S3 with Object Lock for 5 years.

## 4. Secrets Management

### 4.1 Secrets Rotation Plan
*   All secrets (DB passwords, API keys) are stored in **AWS Secrets Manager**.
*   **Automated Rotation**: Configured for 30-day rotation via Lambda functions.
*   Zero manual handling of production secrets.

## 5. Network Security
*   **VPC Peering/PrivateLink**: No public internet exposure for the backend services.
*   **WAF (Web Application Firewall)**: AWS WAF at the ALB level to protect against SQLi, XSS, and rate limiting.
