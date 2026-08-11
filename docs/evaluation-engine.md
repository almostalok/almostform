# Hiring Evaluation & Scoring Engine Documentation

## Overview
The evaluation engine handles deterministic automatic scoring for objective questions and provides structured human reviewer controls for subjective answers.

## Scoring Formula
For hiring forms, total candidate score is calculated using normalized weighting:

$$\text{finalScore} = \sum \left( \frac{\text{obtainedScore}}{\text{maxMarks}} \times \text{weight} \right)$$

Where:
- `obtainedScore`: Auto score or manual score override
- `maxMarks`: Maximum marks configured for the question
- `weight`: Percentage weight (0 - 100%) assigned to the question

The sum of all scoring weights in a hiring form must total **100%** upon publishing.

## Evaluation Methods
- `AUTOMATIC`: Single Choice, Multiple Choice, Yes/No, Number, Rating
- `MANUAL`: Reviewer directly enters score in `/dashboard/forms/[formId]/responses/[responseId]`
- `RUBRIC`: Criterion-based scoring levels
- `AI_ASSISTED`: Pluggable AI scoring interface (`EvaluationProvider`)

## Candidate Status Workflow
Candidates move through controlled evaluation states:
`NEW` ➔ `REVIEWING` ➔ `SHORTLISTED` / `REJECTED` / `ON_HOLD`
