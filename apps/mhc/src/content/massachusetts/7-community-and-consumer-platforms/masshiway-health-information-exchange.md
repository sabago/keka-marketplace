---
title: "MassHIway - Massachusetts Health Information Exchange"
slug: "masshiway-health-information-exchange"
state: "MA"
category: "state-government"
source_type: "hospital_ehr"
primary_audience: "home-care-agencies"
official_url: "https://www.masshiway.net"
cost_level: "free"
referral_channel_types:
  - "api_integration"
  - "portal"
last_reviewed: "2025-01-18"
---

## Overview

MassHIway is Massachusetts' **statewide Health Information Exchange (HIE)**, enabling secure electronic sharing of patient health information across providers. For home care agencies, MassHIway offers game-changing capabilities: **real-time hospital admission/discharge notifications**, closed-loop referrals, care coordination messaging, and access to patient clinical data—all at NO COST through the HAUS (HIway Access & Use Services) program.

**Key opportunity:** Agencies connected to MassHIway can receive **automatic alerts** when their clients are admitted or discharged from hospitals, enabling proactive care coordination and preventing gaps in care.

**Volume potential:** Agencies report receiving 50+ referrals/week through HIE workflows once fully integrated.

## Who Sends Referrals Through This Source

Through MassHIway:
- **Hospitals** send admission/discharge notifications and referrals
- **Primary care physicians** send care coordination messages
- **Specialists** share clinical updates
- **Emergency departments** alert home care providers about client visits
- **Post-acute facilities** coordinate transitions

## Who Can Receive Referrals

Any healthcare provider can participate:
- Home health agencies
- Home care agencies
- Physician practices
- Behavioral health providers
- Long-term care facilities
- Community health centers

**For private-pay home care:** Event notifications help you stay informed about your clients' healthcare episodes, enabling proactive outreach and care coordination.

## How It Works

**Event Notification Services (ENS):**
1. Home care agency enrolls client in ENS (with consent)
2. When client has hospital encounter (admission, discharge, ED visit), MassHIway automatically sends alert to agency
3. Agency receives notification via secure messaging, email, or API
4. Agency can proactively contact client/family to coordinate care

**Closed-Loop Referrals:**
1. Hospital posts referral to MassHIway
2. Home care agencies in network receive notification
3. Agency accepts referral through MassHIway
4. Care coordination continues via secure messaging

**Direct Messaging:**
- Secure, HIPAA-compliant messaging between providers
- Similar to email but encrypted and compliant

## How to Get Listed / Enrolled

**HAUS Program (FREE Implementation Assistance):**

**Step 1:** Contact MassHIway HAUS Program
- Website: masshiway.net
- Email: haus@masshiway.net
- Phone: Via website contact form

**Step 2:** Complete Participation Agreement
- Sign data use agreement and HIPAA business associate agreement
- No fees for participation

**Step 3:** Technical Implementation (HAUS provides FREE support)
- **Option A:** Direct integration via API (for agencies with EHR/CRM systems like Mastering Home Care)
- **Option B:** Use MassHIway provider portal (web-based, no integration needed)
- **Option C:** Receive notifications via secure email (simplest option)

HAUS program provides FREE:
- Technical assistance
- Implementation support
- Training and onboarding
- Ongoing customer support

**Step 4:** Configure Services
- Set up Event Notification Services for your clients
- Enable Direct Messaging for care coordination
- Join Closed-Loop Referral networks

**Timeline:** 4-8 weeks from application to go-live

## Cost and Lead Quality

**Cost:**
- **100% FREE** - no fees for participation
- FREE implementation assistance through HAUS program
- No transaction fees or subscription costs

**Lead Quality:**
- **Real-time referrals** from hospitals with immediate need
- **Proactive care coordination opportunities** via event notifications
- **Clinical context** - access to patient summaries and discharge instructions
- **Volume:** Agencies report 50+ referrals/week possible

**ROI:** Extremely high—free service that generates new referrals and prevents gaps in care

## Pros and Cons

**Pros:**
- **FREE participation** and implementation support
- **Real-time notifications** improve care coordination
- **Competitive advantage** - few home care agencies are HIE-connected
- **Prevent readmissions** - proactive outreach after discharge
- **Strengthen hospital relationships** through data sharing
- **API integration** possible with Mastering Home Care

**Cons:**
- **Technical implementation** requires IT resources (mitigated by HAUS support)
- **Client consent required** for event notifications
- **Learning curve** for staff
- **Variable hospital participation** (growing but not universal)

## How This Fits Mastering Home Care

MassHIway is **ideal for API integration** with Mastering Home Care:

**Integration Strategy:**

**Phase 1: Event Notification Services**
- MassHIway API sends real-time alerts when clients admitted/discharged
- Mastering Home Care receives webhook → creates task: "Call client about hospital discharge"
- Staff receives Slack/SMS alert for immediate follow-up

**Phase 2: Closed-Loop Referrals**
- Hospital posts referral to MassHIway
- Mastering Home Care API pulls referral data
- Auto-creates intake record with patient demographics and clinical summary
- Routes to appropriate coordinator based on service area

**Phase 3: Direct Messaging**
- Secure messaging integrated into Mastering Home Care interface
- Staff can send/receive messages with hospital discharge planners without leaving platform

**Automation:**
- **Automatic intake creation** from HIE referrals
- **Proactive outreach triggers** from event notifications
- **Clinical data population** from patient summaries
- **Care gap alerts** (client hasn't been seen post-discharge)

**Compliance:**
- HIPAA-compliant by design
- BAA with MassHIway required
- Patient consent documented for event notifications

## Best Practices

1. **Start with Event Notifications:** Simplest value—be alerted when your clients go to hospital
2. **Leverage for Care Coordination:** Call clients within 24 hours of discharge alert
3. **Integrate with Mastering Home Care:** API integration maximizes value
4. **Train Staff:** Ensure intake coordinators understand how to use HIE data
5. **Market This Capability:** Few agencies have HIE integration—use as differentiator with hospitals
6. **Prevent Readmissions:** Proactive post-discharge outreach reduces hospital returns
7. **Expand Over Time:** Start small (event notifications), add closed-loop referrals later

## Related Resources

- [Hospital Discharge Planning Guide](/massachusetts/hospitals-and-referral-platforms/hospital-discharge-planning-guide)
- [Mass General Brigham Referrals](/massachusetts/hospitals-and-referral-platforms/mass-general-brigham-referrals)
- [Massachusetts ACOs](/massachusetts/payers-and-managed-care/massachusetts-acos-overview)
- [Aidin Platform](/massachusetts/hospitals-and-referral-platforms/aidin-platform)
- [WellSky CarePort](/massachusetts/hospitals-and-referral-platforms/wellsky-careport)
