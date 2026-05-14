
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** frontend
- **Date:** 2026-05-06
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Redirect unauthenticated visitors to login and return after sign in
- **Test Code:** [TC001_Redirect_unauthenticated_visitors_to_login_and_return_after_sign_in.py](./TC001_Redirect_unauthenticated_visitors_to_login_and_return_after_sign_in.py)
- **Test Error:** TEST BLOCKED

The test could not be run — authentication failed and the protected-page redirect could not be verified.

Observations:
- The login form displayed an error: 'Email немесе пароль қате'.
- The app remained on the /login page and did not redirect to /student/dashboard.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/68c6c86e-7b53-45b2-9888-1cdb088154a6
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Student signs in and reaches the student dashboard
- **Test Code:** [TC002_Student_signs_in_and_reaches_the_student_dashboard.py](./TC002_Student_signs_in_and_reaches_the_student_dashboard.py)
- **Test Error:** TEST FAILURE

Login did not succeed — the provided credentials were not accepted and the app remained on the login page.

Observations:
- The page displayed the error message 'Email немесе пароль қате' (Email or password incorrect).
- The login form remained visible with the email and password fields filled.
- No redirect to the student dashboard occurred.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/88bc51e2-bdc7-4957-b00f-227b87bb0107
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Teacher signs in and reaches the teacher dashboard
- **Test Code:** [TC003_Teacher_signs_in_and_reaches_the_teacher_dashboard.py](./TC003_Teacher_signs_in_and_reaches_the_teacher_dashboard.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the login failed with the provided credentials.

Observations:
- The page shows the error message 'Email немесе пароль қате'
- The login form remains visible with the email and password fields pre-filled
- No navigation to the teacher dashboard was observed
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/e45a1fa1-254d-451c-a937-4c6feedc8e77
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Upload a valid HTML and CSS project and open the result
- **Test Code:** [TC004_Upload_a_valid_HTML_and_CSS_project_and_open_the_result.py](./TC004_Upload_a_valid_HTML_and_CSS_project_and_open_the_result.py)
- **Test Error:** TEST BLOCKED

The test could not be run — login with the provided credentials failed, so the upload and evaluation workflow could not be reached.

Observations:
- The login page displayed the error message: 'Email немесе пароль қате'.
- After submitting credentials the page stayed on the login screen and did not navigate to the upload/dashboard page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/c6649d39-07b0-4dd3-849e-0f141b58ea5e
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Protected student pages redirect unauthenticated visitors to login
- **Test Code:** [TC005_Protected_student_pages_redirect_unauthenticated_visitors_to_login.py](./TC005_Protected_student_pages_redirect_unauthenticated_visitors_to_login.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/60699bac-9c13-4de1-8c99-c81084851bb9
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Block student access to teacher dashboard
- **Test Code:** [TC006_Block_student_access_to_teacher_dashboard.py](./TC006_Block_student_access_to_teacher_dashboard.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the teacher dashboard page could not be reached due to a server/network error, so it was not possible to verify whether a logged-in student is prevented from accessing the teacher dashboard.

Observations:
- Navigating to /teacher showed a browser error: 'ERR_INVALID_HTTP_RESPONSE'.
- The page only displays a 'Reload' button and no application UI, so authentication state cannot be confirmed.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/feeda659-5113-4c07-8169-a5977e9b187f
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Student can upload a valid project and view the evaluation result
- **Test Code:** [TC007_Student_can_upload_a_valid_project_and_view_the_evaluation_result.py](./TC007_Student_can_upload_a_valid_project_and_view_the_evaluation_result.py)
- **Test Error:** TEST BLOCKED

The test could not be run — login failed with the provided credentials, preventing access to the project upload and evaluation UI.

Observations:
- The login form returned the error message: "Email немесе пароль қате" (Email or password incorrect).
- The page remained on the login screen and did not navigate to the dashboard or upload UI.
- Credentials from the test input were used for the attempt.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/1970cc2d-f523-4411-a41f-5388491c4260
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 New student account can be created and routed correctly
- **Test Code:** [TC008_New_student_account_can_be_created_and_routed_correctly.py](./TC008_New_student_account_can_be_created_and_routed_correctly.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/ffda2024-dc63-40f1-b086-7a212c46c573
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Review AI evaluation scores and feedback
- **Test Code:** [TC009_Review_AI_evaluation_scores_and_feedback.py](./TC009_Review_AI_evaluation_scores_and_feedback.py)
- **Test Error:** TEST BLOCKED

The test could not be run — login failed due to invalid credentials.

Observations:
- The login page showed 'Email немесе пароль қате'
- Two login attempts were submitted with the provided credentials and both failed
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/2d976b55-e480-45d2-b7cd-b809358d87cc
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 View teacher classroom and student overview
- **Test Code:** [TC010_View_teacher_classroom_and_student_overview.py](./TC010_View_teacher_classroom_and_student_overview.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the user could not be authenticated with the provided credentials.

Observations:
- A red error message 'Email немесе пароль қате' (Email or password incorrect) is shown on the login page.
- The page remained on /login with the login form visible and did not navigate to a teacher dashboard.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/94768162-a53f-4854-9c6c-a8293a5ad2e4
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Student can open submission history from the dashboard
- **Test Code:** [TC011_Student_can_open_submission_history_from_the_dashboard.py](./TC011_Student_can_open_submission_history_from_the_dashboard.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the provided login credentials were rejected, preventing access to the dashboard and the submission history feature.

Observations:
- The login page displayed the error message 'Email немесе пароль қате' (Email or password incorrect).
- The page remained on the login screen and did not navigate to the dashboard.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/1c8c877b-b722-4d04-904c-7175dc472f07
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Compare current and previous evaluation attempts
- **Test Code:** [TC012_Compare_current_and_previous_evaluation_attempts.py](./TC012_Compare_current_and_previous_evaluation_attempts.py)
- **Test Error:** TEST BLOCKED

The test could not be run — valid credentials are required to reach the evaluation results page.

Observations:
- The login page displayed the error message: "Email немесе пароль қате".
- The page remained on /login with the email and password fields visible, so the results page could not be accessed.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/4448c426-9926-4bd5-b1bd-0445fad68a36
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Student can open a prior submission result from history
- **Test Code:** [TC013_Student_can_open_a_prior_submission_result_from_history.py](./TC013_Student_can_open_a_prior_submission_result_from_history.py)
- **Test Error:** TEST BLOCKED

Тест жүргізілмеді — жүйеге кіру мүмкін болмады, берілген тіркелгі деректері қабылданбады.

Observations:
- Логин формасы 'Email немесе пароль қате' деген қате хабарын көрсетті.
- Пайдаланушы жүйеге кірмеді және бет жүйелі түрде аутентификацияланған аймаққа ауыспады.
- Субмиссия тарихына өту мүмкін болмады, сондықтан бұрынғы тапсырманы ашып тексеру орындалмады.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/3a67f00a-4981-48a8-909f-c318b58ff174
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014 Teacher can review classroom metrics and a student summary
- **Test Code:** [TC014_Teacher_can_review_classroom_metrics_and_a_student_summary.py](./TC014_Teacher_can_review_classroom_metrics_and_a_student_summary.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the provided teacher credentials were not accepted, so the classroom overview and student summary could not be reached.

Observations:
- The login form displayed the error message 'Email немесе пароль қате' (Email or password incorrect).
- The email field contains 'romirzzac@gmail.com' and the login button was clicked once.
- The page remained on the login screen and did not navigate to the classroom overview.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/0129c9e0-5757-45e4-9848-b83e7954b1cc
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Open a past submission result from history
- **Test Code:** [TC015_Open_a_past_submission_result_from_history.py](./TC015_Open_a_past_submission_result_from_history.py)
- **Test Error:** TEST BLOCKED

The test could not be run — authentication failed with the provided credentials, so the submission history page could not be reached.

Observations:
- The login page displayed the error 'Email немесе пароль қате'.
- Two login attempts were made using the provided credentials and both failed.
- The application requires valid credentials to access submission history.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/29352957-529c-40f5-a5a3-3733d20c07d4
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Review a class and student performance metrics
- **Test Code:** [TC016_Review_a_class_and_student_performance_metrics.py](./TC016_Review_a_class_and_student_performance_metrics.py)
- **Test Error:** TEST BLOCKED

The teacher dashboard could not be reached — login failed and prevented continuing the test. Without a successful login, selecting a class and reviewing student performance cannot be verified.

Observations:
- The login form shows the error banner: "Email немесе пароль қате".
- Email input (index 11) contains 'romirzzac@gmail.com', password input (index 12) is filled, and submit button (index 56) is present.
- The page remained on the login screen; dashboard did not load.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/7d53a342-4efa-4b65-951d-9d769fd90ef3
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 Compare older and newer submissions
- **Test Code:** [TC017_Compare_older_and_newer_submissions.py](./TC017_Compare_older_and_newer_submissions.py)
- **Test Error:** TEST BLOCKED

Тест орындалмады — жүйеге тіркеліп, тапсырма тарихына өту мүмкін болмады because authentication failed.

Observations:
- Кіру әрекетінен кейін бетте "Email немесе пароль қате" деген қатеге хабар көрсетілді.
- Пайдаланушы /login бетінде қалды; ешбір бағыттау (dashboard немесе submission history) орын алған жоқ.
- Берілген логин/пароль қабылданбады, сондықтан тапсырма тарихын тексеруге өту мүмкін болмады.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/d89e984f-73da-4438-9fe0-077dac453785
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018 Open an individual student summary from the teacher dashboard
- **Test Code:** [TC018_Open_an_individual_student_summary_from_the_teacher_dashboard.py](./TC018_Open_an_individual_student_summary_from_the_teacher_dashboard.py)
- **Test Error:** TEST BLOCKED

The test could not be run — the teacher dashboard could not be reached because login failed.

Observations:
- The login page showed 'Email немесе пароль қате'
- The page remained on the login screen after submitting the form

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/14296a0c-6a36-4c43-9e71-dbb95fc90a78
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019 Reject an invalid project package before evaluation
- **Test Code:** [TC019_Reject_an_invalid_project_package_before_evaluation.py](./TC019_Reject_an_invalid_project_package_before_evaluation.py)
- **Test Error:** TEST BLOCKED

The test could not be run — login failed with the provided credentials.

Observations:
- The login form displayed the error message 'Email немесе пароль қате'.
- The page remained on the login screen and did not navigate to the upload/dashboard page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/25f1b4a3-a01b-4ec0-8d3a-05dfe20e3204
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 Student upload rejects an invalid project package
- **Test Code:** [TC020_Student_upload_rejects_an_invalid_project_package.py](./TC020_Student_upload_rejects_an_invalid_project_package.py)
- **Test Error:** TEST BLOCKED

The test could not be run — login failed, preventing access to the project upload feature.

Observations:
- The login form displayed the error message 'Email немесе пароль қате'.
- The page remained on the login screen after submitting credentials.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e86a5f00-13d6-4132-b8f9-675e7871b32a/b148f960-27dc-4007-8f90-9d6462e56d51
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **10.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---