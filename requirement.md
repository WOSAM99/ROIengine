**SCOPE OF WORK – ROI DASHBOARD & INTELLIGENCE LAYER**

**Overview**  
We will build an interactive performance dashboard powered by your uploaded Excel data. The system will transform raw job-level data into clear business insights across revenue, margin, cash flow, and operational efficiency—along with an AI-driven analysis layer to highlight what needs attention.

**1\. Calculated Metrics**

**A. Executive Snapshot**

**Metrics & Formulas:**

- **Total Revenue**  
  \= SUM(`Invoice Amount`)
- **Total Cost**
- \= SUM(`Job Cost`)
- **Gross Profit (GP)**  
  \= Total Revenue − Total Cost
- **Gross Margin (%)**  
  \= (Gross Profit / Total Revenue) × 100
- **Total Jobs**  
  \= COUNT(rows)
- **Revenue per Job**  
  \= Total Revenue / Total Jobs

**B. Revenue & Margin Analysis**

**Metrics & Formulas:**

- **Job-Level Profit**  
  \= `Invoice Amount` − `Job Cost`
- **Job-Level Margin (%)**  
  \= (Job Profit / Invoice Amount) × 100
- **Average Margin (Company)**  
  \= AVG(Job-Level Margin)
- **Low Margin Jobs**  
  \= COUNT(rows WHERE Job Margin \< Target Margin)
- **Revenue by Job Type**  
  \= SUM(`Invoice Amount`) GROUP BY `Project Type`
- **Margin by Job Type**  
  \= (SUM(Revenue) − SUM(Cost)) / SUM(Revenue)

**C. Cash & Collections Overview**

**Metrics & Formulas:**

- **Cash Collected**  
  \= SUM(`Cash Received`)
- **Total Billed (Revenue)**  
  \= SUM(`Invoice Amount`)
- **Outstanding (A/R Total)**  
  \= SUM(`Balance Due`)
- **Collection Gap**  
  \= Total Billed − Cash Collected
- **Collection Efficiency (%)**  
  \= (Cash Collected / Total Billed) × 100

**D. Accounts Receivable (A/R) Aging**

**Metrics & Formulas:**

- **A/R per Bucket**  
  \= SUM(`Balance Due`) GROUP BY `A/R Aging Bucket`
- **A/R Over 30 Days**  
  \= SUM(`Balance Due` WHERE bucket \> 30 days)
- **A/R Risk %**  
  \= (A/R Over 30 Days / Total A/R) × 100

**E. Job Type Intelligence**

**Metrics & Formulas (per Project Type):**

- **Revenue**  
  \= SUM(`Invoice Amount`)
- **Cost**  
  \= SUM(`Job Cost`)
- **Gross Margin (%)**  
  \= (Revenue − Cost) / Revenue
- **Average Cycle Time (Days)**  
  \= AVG(`Finish Date` − `Start Date`)
- **Jobs Below Target Margin**  
  \= COUNT(rows WHERE Job Margin \< Target)
- **Avg Revenue per Job Type**  
  \= Revenue / Number of Jobs

**F. Project Manager (PM) Performance**

**Metrics & Formulas (per PM):**

- **Revenue by PM**  
  \= SUM(`Invoice Amount`) GROUP BY `PM`
- **Cost by PM**  
  \= SUM(`Job Cost`) GROUP BY `PM`
- **Margin (%) by PM**  
  \= (Revenue − Cost) / Revenue
- **PM Variance**  
  \= PM Margin − Company Average Margin
- **Low Performing PMs**  
  \= PMs WHERE Margin \< Company Average

**G. Profit Leak Identification (Rule-Based Logic)**

**1\. Margin Leakage (Job Type)**

- **Leak Condition:**  
  Job Type Margin \< Target Margin
- **Estimated Impact:**  
  \= (Target Margin − Actual Margin) × Revenue

**2\. PM Variance Leakage**

- **Leak Condition:**  
  PM Margin \< Company Avg Margin
- **Estimated Impact:**  
  \= (Company Margin − PM Margin) × PM Revenue

**3\. Cash Flow Delay (A/R Based)**

- **Leak Condition:**  
  High A/R \> 30 days
- **Estimated Impact:**  
  \= SUM(`Balance Due` WHERE \> 30 days)

## **2\. AI-Powered Intelligence Layer**

**Input to AI (Structured Data)**

- Company metrics
- Job type metrics
- PM performance
- A/R breakdown
- Historical comparison (if available)

**AI Output (Structured)**

- Top 3–5 performance issues
- Estimated financial impact
- Root cause indicators
- Recommended actions

**Example Logic Used by AI**

- Compare job type margins vs company average
- Detect abnormal A/R accumulation
- Identify recurring PM underperformance
- Prioritize issues based on financial impact

**Important Notes**

- All calculations are deterministic and system-driven
- AI is used strictly for:
  - Pattern recognition
  - Prioritization
  - Explanation
- AI does not replace financial calculations
- Outputs are structured and aligned with computed data

**4\. Final Outcome**

The system will deliver:

- A **real-time performance dashboard**
- A **profit leak detection system**
- An **AI-powered decision support layer**

**Summary**  
All metrics above are computed directly from the existing dataset. Additional fields will unlock deeper operational and financial intelligence, enabling the platform to evolve into a comprehensive performance optimization system.
