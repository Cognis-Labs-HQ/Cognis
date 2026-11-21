# Usage

Practical procedures for Classes.

## Prerequisites

Sign in; teaching and membership decisions follow Study policy.

## Examples

Choose a class, request membership and wait for the required decision; teachers review requests from their class controls.

Teachers use `/classes` to manage their classes; signed-in learners use `/my-classes` to view their memberships. `GET /api/v1/study/classes?language=ja` returns the teacher’s matching classes, while `GET /api/v1/study/my-classes` returns the learner’s enrolled classes.

## Expected Results

Approved membership grants the class's permitted learning access.

## Troubleshooting

Check teacher eligibility, class capacity and request state before submitting again.
