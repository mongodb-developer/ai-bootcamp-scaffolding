# Incident Runbook: Suspected Unauthorized Activity

## When to use this runbook

Use this runbook when monitoring or a review surfaces activity that may be unauthorized: an approval that appears to violate dual control, a modification to elevated access without a reason, or a transfer that does not match a customer's known pattern. This is a synthetic reference document used for the bootcamp.

## Step 1: Contain

Temporarily suspend the operator or service principal associated with the suspect events. Suspension is reversible and is not a finding of wrongdoing; it limits exposure while the review proceeds.

## Step 2: Reconstruct

Pull the full event trail for the subject: the initiating and approving events, any related USER_MODIFIED events, the channels used, and the timestamps. Confirm whether dual control was satisfied and whether the actor had the required privileges at the time.

## Step 3: Classify

Classify the incident as CONSISTENT (activity matches policy), INCONSISTENT (a clear control violation), or NEEDS REVIEW (insufficient evidence). Record the classification with the supporting events.

## Step 4: Remediate and report

For an inconsistent finding, reverse the impact where possible, restore correct access, and file a report within one business day. For needs-review, gather the missing evidence before closing. Every incident closes with a written outcome linked to the events that triggered it.
