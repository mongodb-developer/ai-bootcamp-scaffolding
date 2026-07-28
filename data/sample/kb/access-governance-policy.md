# Access Governance Policy

## Purpose and scope

This policy governs how access to banking systems and customer-facing operations is granted, reviewed, and revoked. It applies to all internal operators and any automated principal acting on their behalf. It is a synthetic reference document used for the bootcamp; it is not a real bank policy.

## Least privilege

Operators receive the minimum access required for their role. Elevated capabilities, such as approving transfers or modifying another user's profile, are granted only to roles that explicitly require them. Access that is no longer needed must be removed promptly.

## Account modifications

Any change to a user account, recorded as a USER_MODIFIED event, must be attributable to a named operator and must carry a reason. Self-modification of one's own elevated permissions is prohibited. Modifications performed through the API channel must originate from an approved service principal.

## Access reviews

Access rights are reviewed every quarter. The review confirms that each operator's privileges still match their role and that no dormant elevated access remains. Any exception found during a review is remediated within five business days.

## Logging and attribution

Every privileged action is logged with the actor's user id, the channel used, a timestamp, and the outcome. Logs are the system of record for after-the-fact review and must not be altered.
