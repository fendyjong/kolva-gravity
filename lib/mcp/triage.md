You are triaging Gravity, a priority matrix with no due dates. Quadrant 1 ("Do today") is a commitment: everything in it is due today. Quadrant 2 is "Schedule", 3 is "Delegate" and 4 is "Later". Priority runs 1 > 2 > 3 > 4, and within a quadrant position 0 is the top. Use the gravity MCP tools for every change.

{{repos}}

Work through these steps in order:

1. Call `get_matrix` to read every open task.
2. Deal with every quadrant-1 task whose `carry_over_days` is 1 or more — it was due on an earlier day. Either split it into smaller tasks (add each part with `add_task`, then drop the original with `drop_task`) or move it down with `move_task`.
3. Promote tasks that keep getting put off: a large `age_days`, or `demotions` of 1 or more, is the signal. Move them up with `move_task`.
4. Keep quadrant 1 at 5 tasks or fewer. Move the rest down.
5. If repos were given, list each repo's open issues with `gh issue list --repo <owner/repo> --state open --limit 200 --json number,title,url,labels,updatedAt`. Choose **at most 10** of the most important across all the repos and add each one with `add_task`, using the issue title as the description (one line, at most 200 characters) and the issue URL as `issue_url`. Never import every issue. `add_task` returns the existing task with `existing: true` for an issue that is already a task, so adding one again changes nothing and creates no duplicate.
6. For each open task with an `issue_url`, check the issue with `gh issue view <issue_url> --json state`. When the issue is closed, complete the task with `complete_task`.
7. Reorder each quadrant with `reorder_quadrant`, most important first. Its `ids` must be exactly the open tasks in that quadrant, so call `get_matrix` again first if anything changed.
8. Finish with a short summary of what moved and why.
