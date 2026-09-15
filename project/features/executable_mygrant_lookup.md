# RR-003: Executable MyGrant lookup

## Status

Discovery

## Desired outcome

A service employee can provide the required vehicle information and receive compatible MyGrant glass part numbers without manually navigating the vendor site.

## Ownership

| Role | Accountable for |
|---|---|
| Product Manager | Business outcome, priority, acceptance criteria, and client acceptance |
| Engineering Manager | Delivery plan, engineering quality, testing, and operational readiness |
| Lead System Architect | System boundaries, provider contract, cross-feature decisions, and final integration |

## Lookup paths

### Windshield and Back Glass

1. Enter VIN.
2. Search MyGrant.
3. Normalize compatible parts.
4. Display results.

### Door Glass

1. Select year.
2. Select make.
3. Select model.
4. Enter VIN.
5. Search MyGrant.
6. Normalize compatible parts.
7. Display results.

## Acceptance criteria

- The frontend calls a stable Express API rather than knowing about Playwright.
- Windshield and Back Glass searches begin with VIN.
- Door Glass requires Year, Make, and Model before VIN.
- Results use the same normalized vehicle-and-parts contract as the mock provider.
- No credentials or authenticated session data are committed to source control.
- Timeout, authentication failure, no-result, and vendor-layout-change states are understandable to the user.
- The mock provider remains available for demos and automated tests.

## Discovery questions

- What are the exact URLs for the Year/Make/Model and VIN lookup pages?
- How does MyGrant authentication work and how long does a session remain valid?
- Is multi-factor authentication required?
- Which fields and part-number categories must be returned?
- Does the vendor agreement permit browser automation?
- Where will the browser worker run and which outbound connections are required?

## Planned tasks

| ID | Task | Owner | Status |
|---|---|---|---|
| RR-003-1 | Record both MyGrant workflows | Business Analyst | Todo |
| RR-003-2 | Define normalized lookup contract | Lead System Architect | Todo |
| RR-003-3 | Threat-model credentials and sessions | Security Engineer | Todo |
| RR-003-4 | Confirm hosting and network constraints | Cloud Engineer | Todo |
| RR-003-5 | Build Express provider boundary | Back-end Engineer | Todo |
| RR-003-6 | Implement Playwright provider | Back-end Engineer | Todo |
| RR-003-7 | Connect and verify client workflow | Front-end Engineer | Todo |

