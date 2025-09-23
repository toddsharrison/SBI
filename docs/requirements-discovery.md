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
