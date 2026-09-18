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

### 3.1 Overview
With QueueSmart using a standard three-tier client-server based architecture, there will be a client tier which users and administrators will interact with, alongside a backend application tier that holds the business logic, and a data tier which will store the state. A single external system, in this case an email service, will be used for verification alongside notifications. Everything stated except for email delivery will be all integrated directly into QueueSmart itself. 

### 3.2 Major Components

  1. **Client Tier (Frontend)**: A web and mobile interface for end users to register, join and leave queues, view positions and wait time ETAs, view services available, alongside browse services. For administrators, there will be a dedicated admin dashboard which will be used to be able to create services, manage active queues (such as starting, ending, pausing, resuming), adjusting priorities, and reviewing usage analytics. The client will be rendering data and sending requests only.

  2. **Application Tier (backend):** This will be the primary core of the system, being responsible for authentication, service management, notifications, data analytics (such as history and reporting), and the queue engine (joining, leaving, position, time calculation, etc.). Wait times can be inferred upon per site based on analytics (example being calculating an ETA based on the average time a customer spends on that site before leaving, or how long a queue pass would last before a customer must be sent back to wait again). 

  3. **Data Tier (database):** This database will persist all system state, such as user/admin accounts, service definitions, live queue entries, and historical participation records that will be fed to admin statistics.

### 3.3 How Components Will Interact

  1. A user or administrator will authenticate through the frontend, with the backend verifying credentials and role, triggering the email service for further verification.

  2. An administrator will create and configure services through the dashboard, with the backend storing definitions in the database.

  3. A user will join the queue from the client, with the queue engine inserting them in order of arrival time and priority. The queue engine will then poll and return their updated position and estimated wait time to the frontend.

  4. As the queue advances further, the backend will push live updates to the client end,  such as when a user nears their turn or passes the queue, a message will be handed to the email service and/or notification system.

  5. Each completed interaction will be written to history, with the backend aggregating history the administrator's usage statistics view. 


---

## 4. System Context Diagram

![QueueSmart System Context Diagram](Team_29_4353_HW1_Diagram.png)
