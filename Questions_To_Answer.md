# QueueSmart – Assignment 1

## 1. Initial Thoughts

### 1.1 Main Users of the System

QueueSmart serves two primary user segments, each with distinct needs and workflows:

**End-Users (Clients / Students / Patients):**  
Individuals seeking service at student centers, clinics, or help desks who want to minimize physical waiting and gain transparency into wait times.

**Administrators (Staff / Service Managers):**  
Personnel responsible for operating service counters, managing service catalog definitions, and monitoring live queue flow to optimize efficiency.

### 1.2 User and Administrator Interaction

**End-User Experience:**  
Users will interact with a responsive web or mobile interface to register, browse available services, join or leave queues remotely, and monitor their live position and dynamic wait time.

**Administrator Experience:**  
Administrators will utilize a dedicated management dashboard to configure service parameters, control active queue states, override priorities when necessary, and review historical usage statistics.

### 1.3 Most Important Features

**Real-Time Queue Tracking:**  
Live visibility into queue positions and estimated wait times, updating dynamically as the line progresses.

**Priority-Based Queue Ordering:**  
An intelligent sorting mechanism that balances arrival timestamps with assigned service priorities (low, medium, high) to handle urgent requests seamlessly.

**Proactive Notifications:**  
Automated alerts (in-app or email) that notify users when they are approaching their turn, preventing missed appointments and reducing lobby congestion.

### 1.4 Anticipated Challenges

**Inaccurate Wait-Time Estimations:**  
Fluctuating service durations (e.g., one client taking much longer than expected) can throw off calculations.

**Mitigation:**  
Implementing a rolling-average calculation model based on recent service completions.

**Real-Time State Synchronization:**  
Keeping client views synchronized with backend queue changes without overloading the server.

**Mitigation:**  
Leveraging lightweight polling or WebSockets for efficient state updates.

**Notification Delivery Reliability:**  
Ensuring users receive alerts promptly even if they minimize or leave the application interface.

---

## 2. Development Methodology

### 2.1 Chosen Methodology

Our team will follow **Scrum**, an Agile framework, to guide the development of QueueSmart throughout the semester.

### 2.2 Why This Methodology Is Appropriate

**Fits the Project's Modular Structure:**
QueueSmart breaks naturally into distinct feature areas (authentication, service management, queue logic, notifications, and history), which Scrum's iterative approach is well-suited to handle as separate, testable units rather than one large upfront design.

**Supports Team Collaboration:**
With a four-person team, Scrum's emphasis on shared ownership, frequent communication, and short feedback loops helps distribute work evenly and keeps everyone accountable, rather than relying on one or two members to drive the whole project.

**Accommodates Evolving Requirements:**
As the project moves from design (A1) into UI/UX (A2), API design (A3), and data design (A4), our understanding of the system will deepen. Scrum's sprint structure gives us regular checkpoints to revisit and refine earlier decisions based on what we learn, instead of locking in assumptions too early.

### 2.3 Supporting Work Across Multiple Assignments

**Assignment-Based Sprints:**
We are treating each assignment as its own sprint with a defined goal: A1 for design and architecture, A2 for UI/UX, A3 for the API layer, and A4 for data design, building toward the final project and demo.

**Sprint Planning and Check-Ins:**
At the start of each sprint, we will define clear deliverables and split tasks among team members, with brief check-ins throughout to track progress and surface blockers early.

**Sprint Review:**
At the end of each sprint, we will review completed work against the assignment requirements before moving into the next one, ensuring nothing carries forward incomplete.

**Traceable Contributions:**
This structure keeps GitHub contribution history clear, since each team member's work maps to a specific sprint and deliverable, which supports the assignment's contribution documentation requirement.

---

## 3. High-Level Design / Architecture

---

## 4. System Context Diagram

![QueueSmart System Context Diagram](Team_29_4353_HW1_Diagram.png)
