# SkillBridge 🚀

**Merit-first student talent discovery for local businesses.**

SkillBridge connects students from Tier-2 and Tier-3 colleges with MSMEs through reviewer-verified skills, practical assignments, auditable TrustScore, and real project delivery. Hiring decisions are based on demonstrated work rather than college brand or an inflated resume.

## 🔗 Live Demo

[https://skillbridge.debarghya.org](https://skillbridge.debarghya.org) 👈

## 💡 Problem and Approach

Capable students often lack access to credible work, while local businesses struggle to find affordable, evidence-backed talent. SkillBridge closes both gaps with one end-to-end workflow:

1. Platform admins publish versioned skill standards, upgrade criteria, renewal periods, and practice tasks.
2. Students add a catalog skill or keep a profile-only self-declared skill and request catalog support.
3. Authorized review staff inside the Admin workspace assess submitted evidence against the standard captured at submission.
4. Companies discover candidates through active verified skills, TrustScore, and practical interview tasks.
5. Each selected student continues in an independent GIG Work item grouped under the source GIG in Project Workspace.
6. Companies approve delivery and record the payment made outside SkillBridge.

### How the main parts connect

| Part | Role in the opportunity bridge | TrustScore effect |
| --- | --- | --- |
| **Student and company accounts** | Registration references and role-based access help students and local businesses meet. | An access requirement, not proof of identity or a source of points. |
| **Skill Hub and verified skills** | Admins publish standards; students submit evidence; authorized reviewers decide what is verified. | Approved verification, renewal, upgrades, practice, and challenges can earn credit. A reviewed rejection below 40/100 or verification expiry can reduce the score. |
| **GIGs** | Companies post work; students apply or receive opportunities, complete interview tasks, and deliver selected work. | Applying, interviewing, and selection earn no points. A completed GIG earns credit after the company records external payment. |
| **Network and Team-Up** | Students form connections and collaborate on team projects. | Individual requests and joins earn no points; persisted accepted-activity milestones can earn credit. |
| **External payment** | The company pays the student directly and reports the completed payment in SkillBridge. | The recorded payment completes the GIG credit event; the amount paid is not itself a score multiplier or bank-verified transaction. |
| **TrustScore** | A shared, evidence-based signal for discovery and matching. | The server combines eligible credits and penalties with category caps and evidence gates; base credits need not equal the displayed score change. |

## ✨ Product Capabilities

| Experience | What is implemented |
| --- | --- |
| **🎓 Student** | Profile and portfolio, GIG discovery, saved/applied/active work, direct invites, interview assignments, Skill Hub, TrustScore, peer network, Team-Up, and earnings history. |
| **🏢 Company** | Business profile, GIG publishing, applicant pipeline, talent search, direct opportunities, task library, submission review, project workspace, and external payment records. |
| **🛡️ Platform admin** | Versioned skill catalog, verification and upgrade standards, daily-task library, student skill-request decisions, reviewer-team lifecycle, and the blind assessment queue with claim ownership, scoring, revision, approval, rejection, and history. Reviewer-role staff sign into this workspace with queue-only access. |
| **📈 Merit layer** | Verified skill stages, renewal and retention, approved-activity streaks, skill-gap analysis, event-ledger TrustScore, and public evidence-backed profiles. |

### 🛡️ Core Guarantees

- Unreviewed profile content does not award TrustScore.
- Self-declared skills remain profile-only until an admin maps them to a published catalog standard.
- Approval from the Admin review queue is required before a skill becomes verified or upgraded.
- Only active verified skills count in talent discovery, GIG matching, and Network skill summaries; public profiles label non-archived unverified skills.
- Duplicate assessment, payment, and TrustScore events are guarded at the database and service layers.
- SkillBridge records externally completed payments; it does not hold funds, provide escrow, or offer withdrawals.

## 🏗️ Architecture

### 1. 🧱 3-Tier Client-Server Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         1. PRESENTATION TIER                             │
│                         React + Vite Client                              │
│                                                                          │
│  Public Experience        Student Workspace         Company Workspace    │
│  - Landing and login      - Profile and portfolio  - Business profile    │
│  - Public profiles        - GIG Center             - GIG Management      │
│                           - Skill Hub and tasks     - Talent Search      │
│                           - TrustScore             - Project Workspace   │
│                           - Network and Team-Up    - External Payments   │
│                           - Earnings                                     │
│                                                                          │
│  Admin Workspace: catalog, requests, blind reviews and review team       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     │ HTTPS / JSON API
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          2. APPLICATION TIER                             │
│                       Node.js Native HTTP Server                         │
│                                                                          │
│  Request Pipeline                         Domain Services                │
│  - Routing and JSON parsing               - Student and Company          │
│  - Session authentication                 - GIG and Interview Tasks      │
│  - Student, Company and Admin workspaces  - Skill Catalog and Requests   │
│  - CORS and rate limiting                 - Blind Reviewer Queue         │
│  - Payload and ownership validation       - TrustScore Policy Engine     │
│  - Conflict and error handling            - Network and Team-Up          │
│                                           - Workspace and Payments       │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     │ Mongoose ODM
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                             3. DATA TIER                                 │
│                            MongoDB Database                              │
│                                                                          │
│  Core Accounts            Evidence and Work        Community and Metrics │
│  - Students               - SkillAssessments       - NetworkConnections  │
│  - Companies              - TaskSubmissions        - TeamPosts           │
│  - Admin operations users - Review history         - SiteMetrics         │
│  - SkillCatalogs          - SkillRequests                                │
│  - Role sessions          - External payment data                        │
│                                                                          │
│  Embedded account state: profiles, Skill Hub activity, TrustScore ledger,│
│  GIG state, company task library and project workspace                   │
│  Earnings: approved/unpaid and completed/paid TaskSubmissions             │
└──────────────────────────────────────────────────────────────────────────┘
```

> ⚡ **Quick flow:** React interface → secured Node.js API → Mongoose models → MongoDB persistence.

### 2. 🔄 System Architecture & Workflow Diagram

```mermaid
%%{init: {"flowchart": {"rankSpacing": 110, "nodeSpacing": 20}}}%%
flowchart TB
    subgraph Actors[Platform Users and Visitors]
        Student[Student]
        Company[Company or MSME]
        Admin[Platform administrator]
        Reviewer[Authorized review staff]
        Visitor[Unauthenticated visitor]
    end

    subgraph Client[React and Vite Presentation Layer]
        Landing[Landing and authentication]
        StudentUI[Student workspace: Profile, GIG Center, TrustScore, Skill Hub, Network and Earnings]
        CompanyUI[Company workspace: Business Profile, GIG Management, Talent Search, Projects and Payments]
        AdminUI[Admin workspace: admin governance and reviewer blind queue]
        ProfilePreviews[Student and company profile previews inside workspaces]
        ApiClient[Shared HTTP and JSON API client]

        Landing --> ApiClient
        StudentUI --> ApiClient
        CompanyUI --> ApiClient
        AdminUI --> ApiClient
        StudentUI --> ProfilePreviews
        CompanyUI --> ProfilePreviews
        ProfilePreviews --> ApiClient
    end

    Student --> Landing
    Student --> StudentUI
    Company --> Landing
    Company --> CompanyUI
    Admin --> Landing
    Admin --> AdminUI
    Reviewer --> Landing
    Reviewer --> AdminUI
    Visitor --> Landing

    subgraph Backend[Node.js Application Layer]
        Router[Native HTTP router]
        Security[CORS, rate limiting and route-specific authentication and role checks]
        Validation[Payload validation, URL safety, ownership checks and conflict handling]

        StudentController[Student profile controller]
        SkillController[Skill Hub, catalog and assessment controllers]
        ReviewerController[Reviewer queue and rubric controller]
        AdminController[Catalog governance and reviewer operations]
        TrustController[TrustScore ledger and policy engine]
        GigController[GIG discovery and application controller]
        TaskController[Interview, delivery and workspace bridge]
        CompanyController[Company, talent and project controller]
        NetworkController[Connection and Team-Up controller]
        PaymentController[External payment and earnings controllers]

        Router --> Security --> Validation
        Validation --> StudentController
        Validation --> SkillController
        Validation --> ReviewerController
        Validation --> AdminController
        Validation --> TrustController
        Validation --> GigController
        Validation --> TaskController
        Validation --> CompanyController
        Validation --> NetworkController
        Validation --> PaymentController
    end

    ApiClient -->|HTTPS requests and JSON responses| Router

    subgraph Database[MongoDB Data Layer through Mongoose]
        Students[(Students: profile, sessions, Skill Hub state, GIG state and TrustScore ledger)]
        Companies[(Companies: profile, GIG state, task library and project workspace)]
        Reviewers[(Admin operations users: admin or queue-only reviewer role, credentials and sessions)]
        Assessments[(SkillAssessments: evidence, rubric, claim and review history)]
        Catalog[(SkillCatalogs: versioned standards and practice tasks)]
        SkillRequests[(SkillRequests: student requests and admin decisions)]
        Submissions[(TaskSubmissions: interview, delivery, payment and completion state)]
        Connections[(NetworkConnections and TeamPosts)]
        Metrics[(SiteMetrics)]
    end

    StudentController <--> Students
    SkillController <--> Students
    SkillController <--> Assessments
    SkillController --> Companies
    ReviewerController <--> Reviewers
    ReviewerController <--> Assessments
    ReviewerController --> Students
    AdminController <--> Reviewers
    AdminController <--> Catalog
    AdminController <--> SkillRequests
    AdminController --> Students
    SkillController --> Catalog
    SkillController --> SkillRequests
    TrustController <--> Students
    GigController <--> Students
    GigController <--> Companies
    TaskController <--> Submissions
    TaskController <--> Students
    TaskController <--> Companies
    CompanyController <--> Companies
    CompanyController --> Students
    CompanyController --> Submissions
    NetworkController <--> Connections
    NetworkController --> Students
    PaymentController <--> Submissions
    PaymentController --> Students
    PaymentController --> Companies
    Router -->|Public site-view endpoints| Metrics

    subgraph Workflows[Cross-Role Workflows]
        SkillFlow[Skill evidence submitted]
        ReviewDecision{Blind rubric review decision}
        SkillResult[Approved: verified skill and TrustScore update]
        ReviewFeedback[Revision or rejection: feedback to student]
        GigFlow[GIG application or direct invite]
        InterviewFlow[Interview review and student selection]
        WorkFlow[Independent GIG Work and delivery]
        PayFlow[External payment recorded, work completed and TrustScore updated]

        SkillFlow --> ReviewDecision
        ReviewDecision -->|Approved| SkillResult
        ReviewDecision -->|Revision or rejection| ReviewFeedback
        GigFlow --> InterviewFlow --> WorkFlow --> PayFlow
    end

    SkillFlow -.-> SkillController
    ReviewDecision -.-> ReviewerController
    GigFlow -.-> GigController
    PayFlow -.-> PaymentController
```

> ⚡ **Quick flow:** User or visitor → workspace or public page → public or role-protected API endpoint → MongoDB data layer → updated view.

#### Project Data Flow Diagram (Level 1)

The project-wide DFD is shown in four small views to keep labels readable and reduce crossing arrows. Rectangles are people, rounded nodes are processes, and cylinders are logical records, not individual database collections. `D1` is the same logical account store in every view; `D3` and process `7` (TrustScore) are shared by the last three views. A2 shows the shared TrustScore process updating the current score in `D1`. Repeated Student or Company boxes represent the same actor at different stages. Arrows show information, never the movement of money.

##### A1. Registration and profiles

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 55, "rankSpacing": 80}}}%%
flowchart TB
    Student[Student] -->|Aadhaar or DigiLocker reference| Account([1. Register and build profile])
    Company[Company] -->|GSTIN or Udyam reference| Account
    Account -->|Account and optional profile content| D1[(D1. Accounts and profiles)]
```

##### A2. Skill review and TrustScore

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 55, "rankSpacing": 80}}}%%
flowchart TB
    Admin[Platform admin] -->|Publish standard| D2[(D2. Skill standards and assessments)]
    Student[Student] -->|Skill evidence| Review([2. Human skill review])
    Reviewer[Authorized reviewer] -->|Rubric decision| Review
    Review <-->|Read standard / save assessment| D2
    Review -->|Verification status| D1[(D1. Accounts and profiles)]
    Review -->|Eligible credit or penalty| Score([7. TrustScore policy])
    Score -->|Score event| D3[(D3. TrustScore event history)]
    Score -->|Current score| D1
```

##### B1. GIG selection, work, and external payment

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 55, "rankSpacing": 80}}}%%
flowchart TB
    CompanyGig[Company] -->|GIG and interview task| Select([3. Match and assess applicants])
    StudentApply[Student] -->|Application and interview answer| Select
    D1[(D1. Accounts and profiles)] -->|Verified skills and score| Select
    Select -->|Application and selection| D4[(D4. GIG, interview and work records)]
    Select -->|Selected student| Work([4. Brief, delivery and approval])

    CompanyWork[Company] -->|Brief and approval decision| Work
    StudentWork[Student] -->|Deliverable or revision| Work
    Work -->|Delivery and approval| D4
    Work -->|Approved work| Pay([5. Record external payment])
    CompanyPay[Company] -->|Payment details after paying| Pay
    Pay -->|Payment and completion| D4
    Pay -->|Completed GIG credit| Score([7. TrustScore policy])
    Score -->|Score event| D3[(D3. TrustScore event history)]
```

##### B2. Network and Team-Up

```mermaid
%%{init: {"flowchart": {"nodeSpacing": 55, "rankSpacing": 80}}}%%
flowchart TB
    Student[Student] -->|Connection or Team-Up request| Network([6. Network and Team-Up])
    D1[(D1. Accounts and profiles)] -->|Public profile and skills| Network
    Network <--> D5[(D5. Connections and teams)]
    Network -->|Accepted-activity milestone| Score([7. TrustScore policy])
    Score -->|Score event| D3[(D3. TrustScore event history)]
```

**At a glance:** Registration and profiles → human skill review → TrustScore; GIG application and interview → selected work → external payment record → TrustScore. Accepted Network milestones can also contribute.

- Registration requires an Aadhaar **or** DigiLocker reference for students and a GSTIN **or** Udyam reference for companies. This final-year prototype checks that a reference is supplied and stores its fingerprint; it does not verify it through a government service.
- TrustScore rewards eligible reviewed work and completed GIGs, while low-scoring reviewed rejection and verification expiry can apply penalties. Registration, profile videos, ordinary applications, and individual connections do not award or deduct points.
- Intro videos are optional profile content, not proof of skill. Verified skills require evidence against an admin-published standard and a blind human review.
- The interview task is separate from paid work. Each selected student has an independent GIG work record with delivery, possible revision, and company approval.
- The company pays outside SkillBridge and then records the payment. The platform does not handle or guarantee funds; eligible outcomes feed the capped, event-based TrustScore.
- Accepted connections can see saved contact details on full profiles. Team-Ups support collaboration, and current GIG skill demand drives the Skill Gap report.

### 3. 💼 Full GIG Pipeline

```mermaid
flowchart TD
    subgraph CompanySetup[Company GIG Management]
        Create[Create GIG with title, skills, budget, location, work mode and type]
        Publish[Save with selected status, Hiring by default]
        CompanyState[(Company gigManagementState)]
        Create --> Publish --> CompanyState
    end

    subgraph StudentDiscovery[Student GIG Center]
        Browse[Load browsable company GIGs]
        Match[Show informational profile-skill match percentage]
        Save[Save or unsave GIG]
        Apply[Apply to GIG]
        StudentGigState[(Student gigState)]

        Browse --> Match
        Browse --> Save --> StudentGigState
        Browse --> Apply --> StudentGigState
    end

    CompanyState -->|Hiring, Reviewing or In Progress listings| Browse
    Apply -->|Add applicant and update company metrics| CompanyState

    subgraph CandidateSelection[Applicant and Invitation Flow]
        Applicants[Company reviews current applicant profiles]
        Talent[Company discovers talent directly]
        Assignment[Create or select a validated interview assignment]
        Send[Send interview task]
        Opportunity[(Student opportunity snapshot)]
        Choice{Student decision}
        Declined[Declined opportunity]
        Accepted[Accepted opportunity]

        Applicants --> Assignment
        Talent -->|Direct invite| Assignment
        Assignment --> Send --> Opportunity --> Choice
        Choice -->|Decline| Declined
        Choice -->|Accept| Accepted
    end

    CompanyState --> Applicants

    subgraph Interview[Interview Assessment]
        OpenTask[Open accepted assignment]
        TaskType{Assignment type}
        TaskEvidence[Task-specific evidence: response and/or public link]
        SubmitInterview[Submit interview evidence]
        Submission[(TaskSubmission document)]
        ReviewInterview{Company review}
        InterviewRevision[Needs revision with feedback]
        InterviewRejected[Rejected]
        Reviewed[Reviewed with optional score]
        Selected[Student selected]

        OpenTask --> TaskType
        TaskType --> TaskEvidence --> SubmitInterview
        SubmitInterview -->|Status: submitted| Submission --> ReviewInterview
        ReviewInterview -->|Needs revision| InterviewRevision --> SubmitInterview
        ReviewInterview -->|Reject| InterviewRejected
        ReviewInterview -->|Review| Reviewed
        Reviewed -->|Select or ready to hire| Selected
    end

    Accepted --> OpenTask

    subgraph Delivery[Project Workspace, Active Work and Delivery]
        WorkspaceGroup[GIG group in Project Workspace]
        Workspace[Existing submission becomes an independent GIG Work item per student]
        SelectedActive[Student Active GIG: selected; final delivery locked]
        Kickoff[Company submits the work brief and starts the GIG]
        WorkStarted[Status: work started; brief-sent checkpoint shown]
        Updates[Company shares project updates]
        Milestones[Company creates, completes or reopens milestones]
        StudentWork[Student opens Active GIG, reads the brief and completes real work]
        Deliver[Student submits final delivery]
        DeliveryReview{Company reviews delivery}
        DeliveryRevision[Needs revision with delivery-stage return state]
        Approved[Status: approved; payment pending]

        Selected -->|Group by source GIG| WorkspaceGroup
        WorkspaceGroup -->|One item per selected submission| Workspace
        Workspace --> SelectedActive
        Workspace --> Kickoff
        Kickoff -->|One company action| WorkStarted
        Workspace --> Updates
        Workspace --> Milestones
        WorkStarted --> StudentWork --> Deliver
        Deliver -->|Status: delivered| DeliveryReview
        DeliveryReview -->|Needs revision| DeliveryRevision --> StudentWork
        DeliveryReview -->|Approve| Approved
    end

    subgraph ExternalPayment[External Payment Recording]
        Pending[Approved work appears as awaiting payment]
        PayOutside[Company pays student outside SkillBridge]
        Confirm[Company confirms payment was already made]
        ValidatePayment[Validate ownership, amount, payment date, method and unique reference]
        PaymentTransaction[Payment recording and TrustScore update]
        Completed[Status: completed]
        PaymentRecord[(TaskSubmission externalPayment record)]

        Approved --> Pending --> PayOutside --> Confirm --> ValidatePayment --> PaymentTransaction
        PaymentTransaction --> Completed
        PaymentTransaction --> PaymentRecord
    end

    subgraph Results[Shared Results]
        StudentCompleted[Student Completed GIGs]
        CompanyHistory[Company payment history and project history]
        StudentEarnings[Student read-only earnings history]
        TrustEvent[(TrustScore event: gig completed with +150 base credit)]
        TrustScore[Recalculate TrustScore under policy caps and evidence gates]
        Profile[Completed GIG count and refreshed student and company talent views]

        Completed --> StudentCompleted
        Completed --> CompanyHistory
        PaymentRecord --> StudentEarnings
        PaymentTransaction --> TrustEvent --> TrustScore --> Profile
    end

    Submission -.->|Same TaskSubmission with stable IDs| Workspace
    Completed -.->|Removed from Active GIGs| StudentCompleted
```

> ⚡ **Quick flow:** Company creates a browsable GIG → student applies or receives a direct opportunity → student completes the interview task → company reviews and selects one or more students → each selected student's submission becomes an independent GIG Work item → company sends the paid brief and starts work → student delivers and may revise → company approves → external payment is recorded → that student's GIG Work completes, earnings update, and TrustScore is recalculated.

### 4. 🎓 Full Skill Hub Pipeline

```mermaid
flowchart TD
    subgraph Governance[Platform Admin Governance]
        Draft[Create draft skill standard]
        Define[Define aliases, stages, verification rules, upgrade rules, renewal period and daily tasks]
        Publish[Publish versioned catalog skill]
        Catalog[(SkillCatalog)]
        ReviewerOps[Provision, suspend or reactivate reviewer accounts]
        Draft --> Define --> Publish --> Catalog
    end

    subgraph StudentInventory[Student Skill Inventory]
        Add{Add skill}
        Browse[Choose a published catalog skill]
        Custom[Add a self-declared skill]
        ProfileOnly[Profile-only: no verification, matching or TrustScore]
        Request[Request platform support or mapping]
        RequestRecord[(SkillRequest)]
        RequestDecision{Admin decision}
        Owned[Catalog-backed skill on student profile]
        Archive[Archive skill: hide from matching and block new assessments]
        Restore[Restore skill]
        Add --> Browse --> Owned
        Add --> Custom --> ProfileOnly
        ProfileOnly --> Request --> RequestRecord --> RequestDecision
        RequestDecision -->|Approve or merge| Owned
        RequestDecision -->|Reject with reason| ProfileOnly
        Owned --> Archive --> Restore --> Owned
        Catalog --> Browse
        Catalog --> RequestDecision
    end

    subgraph StudentActions[Governed Skill Actions]
        Select{Choose action}
        Verify[Initial verification]
        Reverify[Renew due or expired verification]
        Upgrade[Upgrade to the next published stage]
        Retain[Submit daily practice]
        Challenge[Complete a published daily task]
        Evidence[Submit original response and optional evidence link]
        Owned --> Select
        Select --> Verify --> Evidence
        Select --> Reverify --> Evidence
        Select --> Upgrade --> Evidence
        Select --> Retain --> Evidence
        Select --> Challenge --> Evidence
    end

    subgraph SubmissionAPI[Assessment Validation and Snapshot]
        Validate[Validate ownership, catalog availability, mode, stage, task, response and URL]
        Snapshot[Capture catalog ID, version and exact criteria]
        Duplicate{Open or same-day attempt exists?}
        Assessment[(SkillAssessment)]
        Pending[Pending blind review]
        Evidence --> Validate --> Snapshot --> Duplicate
        Duplicate -->|Yes| Conflict[Return conflict; no TrustScore change]
        Duplicate -->|No| Assessment --> Pending
    end

    subgraph ReviewerPipeline[Admin Workspace Blind Review]
        AdminQueue[Admin > Review Queue]
        Queue[Available queue]
        Blind[Identity, college, photo, location and TrustScore hidden]
        Claim[Claim with expiring lease]
        Standard[Review captured versioned criteria]
        Rubric[Weighted evidence rubric]
        Decision{Decision}
        Pending --> AdminQueue --> Queue --> Blind --> Claim --> Standard --> Rubric --> Decision
    end

    Decision -->|Needs revision| Revision[Student revises evidence against the original criteria snapshot]
    Revision -->|Same assessment returns to pending review| Pending
    Decision -->|Reject| Rejected[Record feedback; no skill reward; low-score penalty may apply]
    Decision -->|Reviewer approves: at least 70 overall and 3 of 5 in key criteria| Transaction[MongoDB transaction]

    subgraph ReviewEffects[Transactional Review Effects]
        Mode{Assessment mode}
        Verified[Activate verification using catalog renewal period]
        Renewed[Renew verification and preserve remaining valid days]
        Upgraded[Move to next catalog stage]
        Practiced[Record approved practice day and streak]
        Challenged[Record approved daily task]
        SkillLog[(Skill activity log)]
        Ledger[(Idempotent TrustScore event ledger)]
        Transaction --> Mode
        Mode -->|Verify| Verified --> SkillLog
        Mode -->|Renew| Renewed --> SkillLog
        Mode -->|Upgrade| Upgraded --> SkillLog
        Mode -->|Practice| Practiced --> SkillLog
        Mode -->|Challenge| Challenged --> SkillLog
        Mode --> Ledger
    end

    Rejected -->|Assigned reviewer scored below 40: policy penalty| Ledger

    subgraph Results[Derived Platform Results]
        Score[Recalculate TrustScore under policy caps and evidence gates]
        Hub[Skill Hub status, history and progress]
        Matching[Company talent discovery and GIG matching]
        Network[Network discovery]
        PublicProfile[Public profile with verification status]
        LiveGigs[Live company GIG skill requirements]
        Gap[Skill Gap Report]
        Ledger --> Score --> Hub
        SkillLog --> Hub
        Hub -->|Active verified skills only| Matching
        Hub -->|Active verified skills only| Network
        Hub -->|Non-archived skills, including labeled unverified skills| PublicProfile
        Hub --> Gap
        LiveGigs --> Gap
    end

    ReviewerOps --> AdminQueue
```

> ⚡ **Quick flow:** Admin publishes a versioned skill standard → student adds the catalog skill and submits evidence → the exact standard is captured → authorized review staff use the Admin review queue and decide with a blind rubric → reviewer approval updates the skill, activity log, and TrustScore ledger in one transaction → only active verified skills enter matching and network discovery. Public profiles can also show non-archived, unverified skills with their verification status; a self-declared skill must become catalog-backed before it can be verified.

#### Skill Hub Operating Rules

| Action | Requirement | Base credit |
| --- | --- | --- |
| Add skill | Published catalog standard; starts unverified | 0 |
| Verify | Original evidence approved against the captured standard | +60 per skill |
| Renew | Due within 30 days or expired; reviewed evidence | +50 per cycle |
| Upgrade | Active verification; next enabled stage | +100 per level |
| Daily practice | Reviewed evidence; active verification | +20 per IST day |
| Challenge | Reviewed catalog task; active verification | +80 per IST day |

Reviewers must provide feedback and a rubric. Approval requires 70/100 overall and
at least 3/5 each in correctness, evidence, and understanding. Base credits do not
equal the final TrustScore increase; caps and evidence gates apply. Demo examples
remain read-only. See [assessment operations](docs/assessment-operations.md) and
the [TrustScore policy](docs/trustscore-v2.md) for bonuses, penalties, renewal,
seeding, and release checks.

### 5. 🤝 Full Network and Team-Up Pipeline

```mermaid
%%{init: {"flowchart": {"rankSpacing": 110, "nodeSpacing": 20}}}%%
flowchart TD
    subgraph Entry[Authenticated Student Network]
        Open[Open Network workspace]
        Session[Validate active student session]
        Load[Load Network state]
        Discover[Discover students]
        MyNetwork[My Network]
        TeamUp[Team Up]

        Open --> Session --> Load
        Load --> Discover
        Load --> MyNetwork
        Load --> TeamUp
    end

    subgraph ReadModel[Network Read Model]
        Relationships[(NetworkConnection records involving the student)]
        RelatedPosts[(Owned TeamPosts and posts containing the student)]
        BrowsePosts[(Newest open TeamPosts owned by other students)]
        Candidates[(Bounded student discovery results)]
        RelationshipMap[Build connected, incoming, outgoing and available relationship states]
        NetworkResponse[Return suggestions, connections, requests, team posts, invitations, memberships and achievement progress]

        Relationships --> RelationshipMap
        Candidates --> RelationshipMap
        RelatedPosts --> NetworkResponse
        BrowsePosts --> NetworkResponse
        RelationshipMap --> NetworkResponse
    end

    Session --> Relationships
    Session --> RelatedPosts
    Session --> BrowsePosts
    Session --> Candidates
    NetworkResponse --> Discover
    NetworkResponse --> MyNetwork
    NetworkResponse --> TeamUp

    subgraph ProfilePrivacy[Student Profile and Privacy]
        Card[Compact discovery card: name, location, verified skills, streak and TrustScore]
        ViewProfile[Open full public student profile]
        ConnectionCheck{Viewer owns profile or has an accepted connection?}
        PublicEvidence[Return public portfolio, non-archived skills with verification status, activity, work style and collaboration evidence]
        TeamCard[Team-Up participant cards: public fields only]
        Contact[Include saved contact details]
        Private[Keep contact details hidden]

        Discover --> Card --> ViewProfile --> PublicEvidence
        ViewProfile --> ConnectionCheck
        ConnectionCheck -->|Yes| Contact
        ConnectionCheck -->|No| Private
        TeamUp --> TeamCard --> Private
    end

    subgraph ConnectionLifecycle[Connection Lifecycle]
        SendRequest[Send connection request]
        ValidatePair[Validate target, prevent self-request and build normalized pair key]
        Existing{Relationship already exists?}
        Pending[(One pending NetworkConnection per student pair)]
        Recipient[Recipient sees incoming request]
        Decision{Recipient decision}
        Accepted[Status: accepted]
        Declined[Status: declined]
        Cancel[Sender cancels pending request]
        Remove[Either connected student removes connection]
        Revoke[Contact visibility is revoked]

        Discover --> SendRequest --> ValidatePair --> Existing
        Existing -->|Pending or accepted| Conflict[Return conflict]
        Existing -->|None or previously declined| Pending --> Recipient --> Decision
        Decision -->|Accept| Accepted
        Decision -->|Decline| Declined
        Pending -->|Sender action| Cancel
        Accepted -->|Either participant| Remove --> Revoke
    end

    subgraph TeamPostLifecycle[Team-Up Post Lifecycle]
        CreatePost[Create Team-Up]
        ValidatePost[Validate title, description, type, required skills and team size]
        TeamPost[(TeamPost owned by the creator)]
        Publish[Publish as open]
        Edit[Owner edits details or status]
        Capacity[Prevent team size below accepted membership]
        DeleteRule{Any accepted membership history?}
        DeletePost[Owner deletes post]
        ClosePost[Owner closes post and preserves collaboration history]

        TeamUp --> CreatePost --> ValidatePost --> TeamPost --> Publish
        TeamPost --> Edit --> Capacity --> TeamPost
        TeamPost --> DeleteRule
        DeleteRule -->|No| DeletePost
        DeleteRule -->|Yes| ClosePost
    end

    subgraph ApplicationFlow[Student Application Flow]
        Explore[Explore and filter open Team-Ups]
        JoinMessage[Submit contribution message]
        JoinChecks[Check post is open, not owned by applicant, not full and has no active request]
        Application[(Embedded application with pending status)]
        OwnerReview[Owner reviews applicant profile and message]
        ApplicationDecision{Owner decision}
        ApplicationAccepted[Application accepted]
        ApplicationDeclined[Application declined]
        Withdraw[Applicant withdraws pending request]

        Publish --> Explore --> JoinMessage --> JoinChecks --> Application --> OwnerReview --> ApplicationDecision
        ApplicationDecision -->|Accept| ApplicationAccepted
        ApplicationDecision -->|Decline| ApplicationDeclined
        Application -->|Applicant action| Withdraw
    end

    subgraph InvitationFlow[Direct Invitation Flow]
        SelectPost[Owner selects an open Team-Up]
        SelectStudent[Select student and write invitation message]
        InviteChecks[Validate owner, student, capacity and existing request state]
        Invitation[(Embedded invitation with pending status)]
        InviteeDecision{Invited student decision}
        InvitationAccepted[Invitation accepted]
        InvitationDeclined[Invitation declined]

        TeamPost --> SelectPost --> SelectStudent --> InviteChecks --> Invitation --> InviteeDecision
        InviteeDecision -->|Accept| InvitationAccepted
        InviteeDecision -->|Decline| InvitationDeclined
    end

    subgraph Membership[Membership and Capacity]
        MembershipRecord[Accepted request becomes active membership]
        AcceptedAt[Store acceptedAt for auditable collaboration history]
        Full{Accepted members reached available slots?}
        AutoClose[Automatically close full Team-Up]
        JoinedView[Show owner and other accepted members]
        Leave[Member leaves Team-Up]
        PreserveHistory[Mark membership withdrawn and retain acceptedAt]
        Reopen[Owner may reopen when capacity becomes available]

        ApplicationAccepted --> MembershipRecord
        InvitationAccepted --> MembershipRecord
        MembershipRecord --> AcceptedAt --> Full
        Full -->|Yes| AutoClose
        Full -->|No| JoinedView
        AutoClose --> JoinedView
        JoinedView --> Leave --> PreserveHistory --> Reopen
    end

    subgraph TrustScore[Network TrustScore Integration]
        CountConnections[Count persisted accepted NetworkConnections]
        CountTeamUps[Count persisted current or historical accepted Team-Up participation]
        ConnectionMilestones{100, 500 or 1,000 connections reached?}
        TeamMilestones{10, 50 or 100 Team-Ups reached?}
        TrustLedger[(Idempotent TrustScore event ledger)]
        Recalculate[Recalculate TrustScore under category caps]

        Accepted -->|Persist, then best-effort sync| CountConnections --> ConnectionMilestones
        AcceptedAt -->|Persist, then best-effort sync| CountTeamUps --> TeamMilestones
        Load -->|Reconcile on read| CountConnections
        Load -->|Reconcile on read| CountTeamUps
        ConnectionMilestones -->|Threshold reached| TrustLedger
        TeamMilestones -->|Threshold reached| TrustLedger
        TrustLedger --> Recalculate
    end

    subgraph Persistence[MongoDB Persistence and Safety]
        ConnectionUnique[Unique normalized pairKey prevents duplicate relationships]
        ConnectionIndexes[Requester and recipient status indexes support network reads]
        TeamIndexes[Owner, status, participant and acceptance indexes support Team-Up reads]
        OptimisticLock[Optimistic concurrency rejects conflicting TeamPost updates]
        Authorization[Every write checks session, ownership, participant role and current status]
        Cleanup[Account deletion removes connections, owned posts and participation references]

        Pending --> ConnectionUnique --> ConnectionIndexes
        TeamPost --> TeamIndexes
        Application --> OptimisticLock
        Invitation --> OptimisticLock
        Session --> Authorization
        Authorization --> Cleanup
    end
```

> ⚡ **Quick flow:** Student opens Network → backend builds relationship and Team-Up state from MongoDB → students connect or collaborate through validated requests and invitations → saved contact details appear only on the full profile for its owner or an accepted connection → milestone credits are attempted after acceptance and reconciled from persisted counts on later Network reads if needed.

#### Network API Surface

| Method and route | Authorized behavior |
| --- | --- |
| `GET /api/student/network` | Load discovery suggestions, connection state, Team-Ups, memberships, invitations, requests, and real achievement progress. |
| `GET /api/student/network/profiles/:studentId` | Load a current public student profile and reveal saved contact information only to the profile owner or an accepted connection. |
| `POST /api/student/network/connections/:studentId` | Create a pending connection request using the normalized student-pair key. |
| `PATCH /api/student/network/connection-requests/:connectionId` | Allow only the recipient to accept or decline a pending connection request. |
| `DELETE /api/student/network/connections/:connectionId` | Allow the sender to cancel a pending request or either participant to remove an accepted connection. |
| `POST /api/student/network/team-posts` | Create a validated Team-Up owned by the authenticated student. |
| `PATCH /api/student/network/team-posts/:postId` | Allow only the owner to edit details, capacity, or open/closed state. |
| `DELETE /api/student/network/team-posts/:postId` | Allow only the owner to delete a post that has no accepted membership history. |
| `POST /api/student/network/team-posts/:postId/join` | Submit a validated application to an open Team-Up. |
| `DELETE /api/student/network/team-posts/:postId/join` | Withdraw the authenticated student's pending application. |
| `PATCH /api/student/network/team-posts/:postId/requests/:requestId` | Allow only the owner to accept or decline a pending application. |
| `POST /api/student/network/team-posts/:postId/invitations/:studentId` | Allow only the owner to invite a student to an open Team-Up with capacity. |
| `PATCH /api/student/network/team-posts/:postId/invitations/:requestId` | Allow only the invited student to accept or decline the invitation. |
| `DELETE /api/student/network/team-posts/:postId/membership` | Allow an accepted member to leave while preserving accepted collaboration history. |

## 📁 Folder Structure

```text
skillbridge/
├── .github/
│   └── workflows/ci.yml            # Lint, build and server test pipeline
├── client/                         # React 19 + Vite frontend
│   ├── public/                     # Static browser assets
│   ├── src/
│   │   ├── assets/                 # Runtime videos and screenshot source assets
│   │   ├── auth/                   # Shared login portal
│   │   ├── admin/                  # Auth, governance, review queue and operations APIs
│   │   ├── company/                # Company dashboard and workflows
│   │   ├── config/                 # Frontend runtime configuration
│   │   ├── landing/                # Public landing experience
│   │   ├── lib/                    # API, URL and formatting helpers
│   │   ├── student/                # Student dashboard and workflows
│   │   │   ├── earning/            # Earnings read model
│   │   │   ├── gig/                # GIG discovery and applications
│   │   │   ├── network/            # Connections and Team-Up
│   │   │   ├── profile/            # Profile activity heatmap
│   │   │   ├── skillhub/           # Skills, practice, streak and gap report
│   │   │   └── task/               # Interview and assessment submissions
│   │   ├── ui/                     # Shared profile, loading and toast UI
│   │   ├── App.jsx                 # Routes and protected workspaces
│   │   └── main.jsx                # Browser entry point
│   ├── package.json                # Frontend dependencies and commands
│   ├── vercel.json                 # SPA deployment rewrite
│   └── vite.config.js              # Vite configuration
├── server/                         # Node.js API and MongoDB persistence
│   ├── config/                     # Environment, policies and default state
│   ├── controllers/                # Domain and request handlers
│   ├── models/                     # Ten Mongoose collection schemas
│   ├── routes/                     # Student Network and Skill Hub route groups
│   ├── scripts/                    # Reviewer, seed and reconciliation tools
│   ├── tests/                      # Backend unit and workflow tests
│   ├── utils/                      # Auth, validation, policy and logging helpers
│   ├── package.json                # Backend dependencies and commands
│   └── server.js                   # Native HTTP router and server entry
├── docs/                           # Documentation
│   ├── assets/
│   │   └── screenshots/            # README product screenshots
│   ├── assessment-operations.md    # Reviewer workflow notes
│   ├── gig-pipeline-verification.md
│   ├── landing-page.md
│   └── trustscore-v2.md
├── render.yaml                     # Render backend deployment
└── README.md
```

## 🗄️ Database Design

### 1. 🧩 Persistence Model

SkillBridge uses MongoDB through Mongoose. Account-owned state is embedded in the relevant student or company document, while records that have an independent lifecycle, concurrent actors, or audit requirements use dedicated collections.

#### Current Collections

| Collection | Owner / References | Purpose |
| --- | --- | --- |
| `students` | Student account | Identity, profile, portfolio, Skill Hub state, verified skills, TrustScore event ledger, GIG state, sessions, and usage data. |
| `companies` | Company account | Business profile, GIG management, task library, private review guides, project workspace, sessions, and usage data. |
| `reviewers` | Admin operations account | Admin or queue-only reviewer role, active status, authentication sessions, and last sign-in time. |
| `skillcatalogs` | Platform-owned; references creating/updating `Reviewer` admin | Versioned skill names and aliases, verification rules, stage requirements, renewal periods, and reviewer-checked daily tasks. |
| `skillrequests` | References `Student`, optional matched `SkillCatalog`, and deciding admin | Student requests for a self-declared skill to be approved or mapped into the governed catalog. |
| `skillassessments` | References `Student`; optionally `Reviewer` | Verification, re-verification, upgrade, retention, and challenge submissions with evidence, rubric scores, feedback, claim ownership, and review history. |
| `tasksubmissions` | References `Student` and `Company` | Stable record shared by the interview, selection, workspace, delivery, approval, external-payment, completion, and TrustScore pipeline. |
| `networkconnections` | References requester and recipient `Student` | One normalized relationship per student pair with pending, accepted, or declined status. |
| `teamposts` | References owner and participating `Student` records | Collaboration posts, required skills, available slots, applications/invitations, and membership decisions. |
| `sitemetrics` | Platform-owned | Atomic counters such as site views, keyed by metric name. |

### 2. 🗺️ Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    STUDENT ||--o{ SKILL_ASSESSMENT : submits
    STUDENT ||--o{ SKILL_REQUEST : requests
    SKILL_CATALOG o|--o{ SKILL_REQUEST : resolves
    SKILL_CATALOG o|--o{ SKILL_ASSESSMENT : governs
    REVIEWER o|--o{ SKILL_ASSESSMENT : reviews
    REVIEWER ||--o{ SKILL_CATALOG : administers
    STUDENT ||--o{ TASK_SUBMISSION : submits
    COMPANY o|--o{ TASK_SUBMISSION : owns
    STUDENT ||--o{ NETWORK_CONNECTION : requests
    STUDENT ||--o{ NETWORK_CONNECTION : receives
    STUDENT ||--o{ TEAM_POST : creates
    STUDENT }o--o{ TEAM_POST : participates

    STUDENT {
        ObjectId _id
        string name
        string email
        string passwordHash
        string location
        number trustScore
        array skills
        array projects
        string videoUrl
        array skillHubSkills
        object skillHubState
        object trustScoreState
        object gigState
        array sessions
        date createdAt
        date updatedAt
    }

    COMPANY {
        ObjectId _id
        string businessName
        string email
        string passwordHash
        string location
        object businessProfile
        object dashboardState
        object gigManagementState
        object taskLibraryState
        object taskReviewGuides
        object projectWorkspaceState
        array sessions
        date createdAt
        date updatedAt
    }

    REVIEWER {
        ObjectId _id
        string name
        string email
        string passwordHash
        string role
        boolean active
        array sessions
        date lastSignedInAt
    }

    SKILL_CATALOG {
        ObjectId _id
        string name
        array aliases
        string category
        string status
        number version
        number renewalDays
        array stages
        string verificationInstructions
        array upgradeRequirements
        array dailyTasks
    }

    SKILL_REQUEST {
        ObjectId _id
        ObjectId studentId
        ObjectId matchedSkillId
        string requestedName
        string category
        string status
        string adminFeedback
        ObjectId decidedBy
    }

    SKILL_ASSESSMENT {
        ObjectId _id
        ObjectId studentId
        ObjectId assignedReviewerId
        ObjectId catalogSkillId
        number catalogVersion
        string skillName
        string mode
        string targetStage
        string attemptKey
        string evidenceLink
        string response
        string status
        boolean open
        object rubric
        object criteriaSnapshot
        string feedback
        array reviewHistory
        date reviewedAt
    }

    TASK_SUBMISSION {
        ObjectId _id
        ObjectId studentId
        ObjectId companyId
        number companyGigId
        string companyGigPublicId
        number opportunityId
        string gigTitle
        string taskTitle
        object taskDetails
        string workBrief
        object interviewSubmission
        array matchedSkills
        string submissionLink
        string submissionContent
        string status
        number score
        string feedback
        object externalPayment
        date completedAt
        date submittedAt
        date reviewedAt
    }

    NETWORK_CONNECTION {
        ObjectId _id
        string pairKey
        ObjectId requester
        ObjectId recipient
        string status
        date respondedAt
    }

    TEAM_POST {
        ObjectId _id
        ObjectId owner
        string title
        string description
        string type
        array requiredSkills
        number slots
        string status
        array requests
    }

    SITE_METRIC {
        ObjectId _id
        string key
        number count
        date updatedAt
    }
```

### 3. 🧠 Embedded State and Derived Views

| Data | Source of truth | How it is used |
| --- | --- | --- |
| Student profile and portfolio | `students` | Public profile responses expose a sanitized projection rather than copying data into another collection. |
| Skill definition and eligibility | `skillcatalogs` and `students.skillHubSkills.catalogSkillId` | Admin-published standards control which skills can be verified, upgraded, practiced, and used for matching; self-declared skills remain profile-only. |
| Verified skill level and renewal status | `students.skillHubSkills` | Updated only after reviewer-approved assessment outcomes and displayed in Skill Hub, Network, GIG matching, and the public profile. |
| Assessment criteria | `skillassessments.criteriaSnapshot` | Captures the catalog ID, version, renewal period, and exact instructions so revisions and reviews remain tied to the submitted standard. |
| Skill activity and streaks | `students.skillHubState.skillLog` and `students.skillHubSkills` | The Skill Hub response derives activity days and streak summaries from recorded events and skills. |
| Skill Gap report | `students.skillHubSkills` and `companies.gigManagementState.gigs` | Calculated on request from the student's skills and active, non-demo company GIG requirements; it is not a stored student snapshot. |
| TrustScore | `students.trustScoreState.events` | The event ledger is authoritative; `students.trustScore` is the materialized total used for fast sorting and display. |
| GIG definition and applicant pipeline | `companies.gigManagementState` | Drives opportunity discovery, applications, company review, and selection. |
| Interview and delivery lifecycle | `tasksubmissions` | Connects the student, company, GIG, task, workspace, revision, approval, payment, and completion stages. |
| Earnings and payment history | `tasksubmissions.status` and `tasksubmissions.externalPayment` | Approved, unpaid submissions appear as awaiting payment; recorded external payments appear in history and totals. SkillBridge stores no wallet, escrow, or withdrawable balance. |
| Network cards and team-up views | `students`, `networkconnections`, `teamposts` | API responses join current profile/skill data with relationship and collaboration records. |

### 4. 🛡️ Integrity and Concurrency Controls

- Unique account identifiers prevent duplicate logins within each student, company, and reviewer account collection.
- A unique normalized catalog-term index prevents two skill standards from sharing a canonical name or alias.
- A partial unique index permits only one pending request for the same student and self-declared skill.
- Partial unique indexes allow only one open Skill Hub assessment per student attempt, while queue indexes support reviewer claims and history lookup.
- A normalized unique `pairKey` prevents duplicate network relationships between the same two students.
- A compound unique index prevents duplicate task submissions for the same student, company, GIG, and opportunity.
- External transaction references are unique per company, making payment recording idempotent and auditable.
- Optimistic concurrency protects student TrustScore/Skill Hub updates, assessment reviews, task submissions, and team-post decisions from silent overwrite.
- Assessment reviews use MongoDB transactions to commit the decision and TrustScore change together. Payment recording also uses a transaction when supported; on standalone MongoDB, a conditional update protects the payment record, but the subsequent TrustScore ledger update is not cross-document atomic.

## 🖼️ Product Screens

<!-- markdownlint-disable MD033 -->

### 🌿 Landing page

<img src="docs/assets/screenshots/landing-page.png" width="920" alt="SkillBridge landing page full-length screenshot" />

The authenticated workspace captures below use the current interface at a consistent, readable desktop viewport. Illustrative read-only data is used where a screen needs example activity; no private account data is shown.

### 🎓 Student workspace

#### GIG Center

<img src="docs/assets/screenshots/student-gig-center.png" width="920" alt="SkillBridge student GIG Center" />

#### TrustScore

<img src="docs/assets/screenshots/student-trustscore.png" width="920" alt="SkillBridge student TrustScore" />

#### Skill Hub

<img src="docs/assets/screenshots/student-skillhub.png" width="920" alt="SkillBridge student Skill Hub" />

#### Network

<img src="docs/assets/screenshots/student-network.png" width="920" alt="SkillBridge student network" />

#### Earning

<img src="docs/assets/screenshots/student-earning.png" width="920" alt="SkillBridge student earning" />

#### My Profile

| Editable profile | Public profile preview |
| --- | --- |
| <img src="docs/assets/screenshots/student-profile.png" width="590" alt="SkillBridge student profile editor" /> | <img src="docs/assets/screenshots/student-public-profile.png" width="260" alt="SkillBridge public student profile preview" /> |

#### Task page

<img src="docs/assets/screenshots/student-task-page.png" width="920" alt="SkillBridge student task page" />

### 🏢 Company workspace

#### My Business

<img src="docs/assets/screenshots/company-dashboard.png" width="920" alt="SkillBridge company command center" />

#### GIG Management

<img src="docs/assets/screenshots/company-gig-management.png" width="920" alt="SkillBridge company GIG management" />

#### Task Center

<img src="docs/assets/screenshots/company-task-center.png" width="920" alt="SkillBridge company Task Center" />

#### Talent Search

<img src="docs/assets/screenshots/company-talent-search.png" width="920" alt="SkillBridge company Talent Search" />

#### Project Workspace

<img src="docs/assets/screenshots/company-project-workspace.png" width="920" alt="SkillBridge company Project Workspace" />

#### Payment

<img src="docs/assets/screenshots/company-payment.png" width="920" alt="SkillBridge company payment" />

#### Business Profile

| Editable business profile | Public business profile preview |
| --- | --- |
| <img src="docs/assets/screenshots/company-business-profile.png" width="590" alt="SkillBridge company business profile editor" /> | <img src="docs/assets/screenshots/company-public-profile.png" width="260" alt="SkillBridge public business profile preview" /> |

### 🛡️ Platform Admin workspace

#### Overview

<img src="docs/assets/screenshots/admin-overview.png" width="920" alt="SkillBridge Platform Admin overview with live queues and recently published skills" />

Screenshot uses representative counts; live totals change with platform activity.

#### Skill Catalog

<img src="docs/assets/screenshots/admin-skill-catalog.png" width="920" alt="SkillBridge Platform Admin Skill Catalog" />

#### Skill Requests

<img src="docs/assets/screenshots/admin-skill-requests.png" width="920" alt="SkillBridge Platform Admin Skill Requests" />

#### Review Queue

<img src="docs/assets/screenshots/admin-review-queue.png" width="920" alt="SkillBridge Platform Admin blind review queue" />

#### Review Team

<img src="docs/assets/screenshots/admin-review-team.png" width="920" alt="SkillBridge Platform Admin Review Team" />

<!-- markdownlint-enable MD033 -->

## 🧰 Tech Stack

| Area | Technology |
| --- | --- |
| Client | React 19, React Router 7, Vite 8, CSS, Lucide icons |
| API | Node.js 22, native HTTP server, REST-style JSON |
| Data | MongoDB, Mongoose 9 |
| Authentication | Role-scoped bearer sessions and password hashing with Node.js crypto |
| Reliability | Schema validation, optimistic concurrency, transactions, unique indexes, rate limits |
| Testing | Node.js test runner, integration scripts, ESLint, Vite production build |
| Delivery | Vercel frontend, Render backend, GitHub Actions CI |

## ⚙️ Local Setup

### 📋 Prerequisites

- Node.js 22 or newer
- npm
- A local or hosted MongoDB deployment

### 1. 📦 Clone and install

```bash
git clone https://github.com/debarghya131/SkillBridge.git
cd SkillBridge
cd server && npm ci
cd ../client && npm ci
```

### 2. 🔧 Configure the API

```bash
cd server
cp .env.example .env
```

Set a valid `MONGO_URL` in `server/.env`. The provided defaults are suitable for a local frontend on `http://localhost:5173`.

### 3. ▶️ Start both applications

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

| Service | Local URL |
| --- | --- |
| Web app | `http://localhost:5173` |
| API | `http://localhost:5000` |
| API readiness | `http://localhost:5000/ready` |

## 🔐 Configuration

### 🖥️ Server: `server/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime mode |
| `MONGO_URL` | required | MongoDB connection string |
| `MONGO_DB_NAME` | required in production when the URI has no database path | Explicit application database name; use `skillbridge` for a new deployment |
| `MONGO_URL` (production) | replica set or mongos required | Production startup checks transaction support for reviewed assessments, account deletion, and payment/TrustScore updates |
| `DB_MAX_POOL_SIZE` | `20` | Maximum MongoDB connections per API instance |
| `DB_MIN_POOL_SIZE` | `0` | Warm MongoDB connections retained per API instance |
| `DB_MAX_IDLE_TIME_MS` | `30000` | Idle MongoDB connection lifetime |
| `DB_SERVER_SELECTION_TIMEOUT_MS` | `10000` | MongoDB server-selection timeout |
| `VERIFICATION_HASH_SECRET` | required in production | 32+ character secret used to HMAC identity/business verification references |
| `PORT` | `5000` | API port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed client origin |
| `SESSION_TTL_DAYS` | `30` | Session lifetime |
| `MAX_SESSIONS_PER_ACCOUNT` | `5` | Concurrent session limit |
| `REVIEW_CLAIM_TTL_MINUTES` | `240` | Reviewer claim lease duration |
| `MAX_REQUEST_BODY_BYTES` | `8000000` | Maximum JSON request size |
| `RATE_LIMIT_WINDOW_MS` | `60000` | General rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `120` | General requests per window |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | `12` | Authentication requests per window |
| `DAILY_USER_RATE_LIMIT_MAX_REQUESTS` | `2000` | Authenticated requests per user per day |
| `DAILY_SECTION_OPERATION_LIMIT` | `2` | Limited writes per section per day |
| `RATE_LIMITING_ENABLED` | `true` | Set to `false` only for controlled local testing |
| `LOG_LEVEL` | `info` | Server log threshold |

Always select the database explicitly. A MongoDB URI with no path and no `MONGO_DB_NAME` falls back to the database named `test`; production startup now rejects that ambiguous configuration. Adding `MONGO_DB_NAME` does not migrate existing collections, so back up and migrate any existing `test` data before changing a deployed service.

Create the first platform administrator from the server directory, then apply production indexes:

```bash
npm run reviewers:create -- --name "Platform Admin" --email admin@example.com --password "use-a-long-temporary-password" --role admin
npm run db:indexes -- --apply
```

### 🌐 Client: `client/.env`

```env
VITE_API_URL=http://localhost:5000
```

`VITE_API_URL` must point to the deployed Render API in production. The API's `CORS_ORIGIN` must contain the corresponding Vercel/custom frontend origin.

### MongoDB Operations

Production disables Mongoose automatic index creation. Run the database commands from `server/` against staging first, then production after a backup:

```bash
# Read-only: inspect document sizes, inline media, and index storage.
npm run db:audit

# Read-only: report existing indexes and explicitly managed redundant indexes.
npm run db:indexes

# Create declared indexes without removing custom indexes.
npm run db:indexes -- --apply

# After reviewing the dry run, remove only known redundant standalone indexes.
npm run db:indexes -- --apply --drop-redundant

# Find legacy raw verification references, then replace them with HMAC fingerprints.
npm run db:migrate-verification
npm run db:migrate-verification -- --apply
```

### Read-only showcase data

Every authenticated student, company, and reviewer receives realistic showcase records alongside genuine records. Showcase records are generated from the version-controlled fixtures in `server/config/showcaseFixtures.js`; they are never inserted into MongoDB and never contribute to real earnings or reputation totals.

Fixture records carry reserved `demo-*` identifiers (or reserved numeric GIG identifiers) and `demoData: true`. Any write aimed at one is rejected with HTTP `403` and the message `Demo data is read-only and cannot be modified or deleted.` Genuine accounts and user-created records remain editable, and students can apply normally to GIGs created by genuine companies.

The following one-time migration removes the earlier database-backed showcase seed and resets only the four accounts explicitly marked by that seed:

```bash
cd server
npm run demo:cleanup -- --confirm
```

The cleanup deletes only documents tagged `demoData: true` and resets `debarghya@gmail.com` and `rahul@gmail.com` student/company documents only when they still carry the legacy `demoMode: true` marker. Passwords, sessions, account identities, and the reviewer account are preserved.

The migration never prints raw identity or registration values. Keep existing inline images/videos until they are moved to object storage; the audit reports every affected document so that migration can be planned without deleting user content.

## 🧪 Quality Checks

```bash
cd server
npm run check
npm test

cd ../client
npm run lint
npm run build
```

For a browser smoke test of real student, company, and admin flows, run `npx playwright install chromium --only-shell` once from `client`, then `npm run test:browser:demo`. The test uses the configured MongoDB server but creates and removes its own `sbqa_*` database; it does not write to the `test` or `skillbridge` application databases.

GitHub Actions runs backend syntax checks and tests plus the production client build on every push and pull request.

## 🚧 Challenges Faced

- Keeping student, company, and reviewer actions consistent across one work lifecycle.
- Turning evidence and practical work into a fair, non-duplicated TrustScore signal.
- Keeping a skill review tied to the requirements the student actually saw, even if an admin later edits the standard.
- Managing responsive dashboards with dense operational workflows.

## ✅ Solutions Implemented

- Centralized the GIG, task, review, payment, and completion lifecycle in persistent backend records.
- Used reviewer rubrics, transactions, unique indexes, and an event ledger to protect skill and TrustScore updates.
- Captured each skill standard's version and criteria with the submission so blind reviewers assess the original requirements.
- Built role-specific, responsive workspaces with shared API helpers and validation.

## 🔮 Future Improvements

- Add notifications for invitations, review outcomes, milestones, and recorded payments.
- Expand browser-level end-to-end coverage and admin observability.
- Add managed media uploads and payment-proof/dispute records.
- Integrate independent identity and business-reference checks and confirmation of company-reported payments.

## 📚 Learnings

- Designing a two-sided marketplace requires explicit ownership and status transitions.
- A reputation system needs auditable events, not client-side counters.
- Account registration, reviewer-verified skills, and company-reported payments provide different levels of evidence and should not be presented as the same kind of verification.
- Focused domain modules make a large React and Node.js application easier to evolve.

## 👤 Author Details

<!-- markdownlint-disable MD033 -->
<img src="docs/author-profile.png" width="100" alt="Debarghya Bandyopadhyay" />
<!-- markdownlint-enable MD033 -->

### Debarghya Bandyopadhyay

### 🤝 Be My Friend

I always like to make new friends. Follow me on:

[![Portfolio](https://img.shields.io/badge/Portfolio-portfolio.debarghya.org-16A34A?style=for-the-badge&logo=vercel&logoColor=white)](https://portfolio.debarghya.org)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Debarghya%20Bandyopadhyay-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/debarghya131)
[![LeetCode](https://img.shields.io/badge/LeetCode-Debarghya131-FFA116?style=for-the-badge&logo=leetcode&logoColor=white)](https://leetcode.com/u/debarghya131/)
[![X](https://img.shields.io/badge/X-Debarghya131-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/debarghya131)
[![Email](https://img.shields.io/badge/Email-Debarghya-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:debarghyabandyopadhyay191@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-Debarghya131-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/debarghya131)

Email: [debarghyabandyopadhyay191@gmail.com](mailto:debarghyabandyopadhyay191@gmail.com)
