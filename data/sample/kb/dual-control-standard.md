# Dual-Control Standard

## Principle

Dual control means a single operator cannot both initiate and approve the same high-value action. A second, distinct operator must approve it. This reduces the risk of error and of unilateral misuse. This is a synthetic reference document used for the bootcamp.

## Threshold for transfers

Transfers at or above 10,000.00 in account currency require dual control. In the operational data, amounts are stored in minor units (cents), so this threshold is 1,000,000 minor units. A transfer at or above this amount is valid only when a TRANSFER_INITIATED event is followed by a TRANSFER_APPROVED event performed by a different operator.

## Separation of duties

The operator who records the TRANSFER_APPROVED event must not be the same operator who recorded the TRANSFER_INITIATED event for that transfer. An approval by the initiating operator is a control failure and must be flagged for review.

## Below-threshold transfers

Transfers below 1,000,000 minor units do not require a second approver, but they remain subject to logging and to the access governance policy. A pattern of many just-below-threshold transfers should be escalated.

## Evidence and review

Both the initiation and the approval are logged with actor, channel, amount, and timestamp. A reviewer confirms dual control by checking that the two events exist, carry the same amount, and were performed by two different operators.
