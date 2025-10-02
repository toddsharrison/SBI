<<<<<<< ours
# Discovery & Requirements Questionnaire

Use this worksheet to capture everything we need to replicate (and improve on) the existing PowerBI experience. We can iterate on it together—start with rough notes and refine over time.

## 1. Dashboard Inventory
| Dashboard | Purpose / Story | Primary Stakeholders | Notes on Priority |
| --- | --- | --- | --- |
|  |  |  |  |

*For each dashboard, attach screenshots or existing URLs when possible.*

## 2. Data Sources & Refresh Cadence
| Source System | Connection Details | Update Frequency | Transformations in PowerBI | Sensitive Fields |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

*Document the SQL views/tables behind each source. Highlight anything calculated inside PowerBI that must move into our new pipeline.*

## 3. Filters, Drilldowns & Interactions
- Global filters (date ranges, mission identifiers, etc.)
- Cross-filtering behaviour between visuals
- Drill-through pages or detail views
- Custom tooltips, annotations, conditional formatting

## 4. Target Users & Access Patterns
| Audience | Access Method (web, mobile, kiosk) | Authentication / Authorization Needs | Accessibility / Branding Requirements |
| --- | --- | --- | --- |
|  |  |  |  |

## 5. Non-Functional Requirements
- Data freshness expectations (e.g., "no older than 15 minutes")
- Performance SLAs (initial load time, interactions)
- Availability / uptime targets
- Audit, compliance, or export control considerations

## 6. Data Quality & Governance
- Known data quality issues or validation rules
- Ownership for each dataset (who can confirm accuracy?)
- Required lineage / catalog tools

## 7. Operational Considerations
- Current deployment / release process for PowerBI artefacts
- Desired environments (dev/staging/prod)
- Alerting or monitoring expectations

## 8. Future Enhancements & Nice-to-haves
- Features that are not critical for launch but should stay on the roadmap
- Integration points with other systems or APIs

---

Once this questionnaire is filled in, we can translate it directly into user stories and a phased delivery plan.
=======
# Space Charts Discovery Workbook

This checklist restarts our requirements gathering so we can design the custom platform with confidence. Fill it out collaboratively with stakeholders; rough notes are fine on the first pass.

---

## Step 1 – Chart & Dashboard Inventory
| Dashboard / Chart | What story does it tell? | Current URL or Screenshot | Business owner | Must-have for launch? (Y/N) |
| --- | --- | --- | --- | --- |
| Example: Mission Timeline | Shows major events and milestones for Mission X | https://spacedata.aei.org/timeline | Mission Control Lead | Y |
|  |  |  |  |  |

> Tip: group related visuals (e.g., a full dashboard page) together so we understand navigation patterns.

---

## Step 2 – Data Sources
| Source System | Type (SQL, CSV export, API) | Connection details / credentials owner | Update frequency | Notes (joins, filters, etc.) |
| --- | --- | --- | --- | --- |
| Example: Mission telemetry warehouse | PostgreSQL | Contact: data-team@aei.org | Every 15 minutes | Filter out test missions |
|  |  |  |  |  |

- List any transformations currently performed inside PowerBI (M scripts, calculated columns). We will recreate them in dbt or SQL.

---

## Step 3 – Refresh Expectations & Automation
- How fresh must each chart be? (e.g., "no more than 30 minutes old")
- Are refreshes event-driven, scheduled, or manual today?
- Who receives alerts when a refresh fails?
- Are there blackout windows when updates should not run?

Capture answers per dashboard if requirements differ.

---

## Step 4 – User Access & Security
| Audience | Access method (web, mobile, kiosk) | Authentication needed? | Authorization (roles, data filters) | Special compliance rules |
| --- | --- | --- | --- | --- |
| Example: AEI leadership | Laptop browser | AEI SSO | Full access | Must log access events |
|  |  |  |  |  |

- Note any guests/partners who will need separate access paths.
- Record row-level security needs (e.g., "Mission leads only see their mission").

---

## Step 5 – Experience & Design Requirements
- Branding guidelines (fonts, colors, logos) we must follow.
- Accessibility expectations (screen reader support, color contrast, keyboard navigation).
- Desired interactions: cross-filtering, drilldowns, annotations, exporting to PNG/PDF.
- Device support: minimum resolutions, mobile/tablet requirements.

---

## Step 6 – Non-functional Requirements
| Category | Requirement | Notes / Source |
| --- | --- | --- |
| Performance | e.g., "Initial chart loads in under 3 seconds on standard AEI laptop" | UX research |
| Availability |  |  |
| Audit & Logging |  |  |
| Disaster Recovery |  |  |
| Budget / Cost Targets |  |  |

Add as many rows as needed; include references to policy documents or past incidents where relevant.

---

## Step 7 – Operations & Team
- Who will own the platform day-to-day? (names + roles)
- What existing tooling (PagerDuty, Teams channels, ServiceNow) should integrate with alerts?
- Expected release cadence (continuous, weekly, etc.).
- Training/documentation needs for analysts who will add new charts.

---

## Step 8 – Future Ideas (Optional)
Capture nice-to-have features so we can plan post-launch work without scope creep.
- Examples: predictive overlays, storytelling narratives, public data portal, API for partners.

---

When this workbook is mostly complete we can translate it into user stories, architecture spikes, and a delivery roadmap.
>>>>>>> theirs
