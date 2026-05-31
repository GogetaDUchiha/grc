"""Full API smoke test for RiskGRC backend."""
import json
import pathlib
import sys
import time

import requests

BASE = "http://127.0.0.1:8000/api"
SAMPLES = pathlib.Path(__file__).resolve().parent.parent / "sample_files"
TIMEOUT = 180
results = []


def check(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    results.append((name, status, detail))
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def main():
    session = requests.Session()
    email = f"fulltest{int(time.time())}@example.com"
    password = "TestPass123!"

    # 1. Register
    try:
        r = session.post(
            f"{BASE}/accounts/register/",
            json={
                "email": email,
                "password": password,
                "first_name": "Full",
                "last_name": "Test",
                "organization_name": "Full Test Org",
                "sector": "Fintech",
            },
            timeout=30,
        )
        check("Register", r.status_code == 201, f"status={r.status_code}")
        if r.status_code != 201:
            print(r.text[:500])
            return report()
        token = r.json()["tokens"]["access"]
        org_id = r.json()["user"]["organizations"][0]["id"]
    except Exception as exc:
        check("Register", False, str(exc))
        return report()

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Login
    try:
        r = session.post(
            f"{BASE}/accounts/login/",
            json={"email": email, "password": password},
            timeout=15,
        )
        check("Login", r.status_code == 200, f"status={r.status_code}")
    except Exception as exc:
        check("Login", False, str(exc))

    # 3. Current user
    try:
        r = session.get(f"{BASE}/accounts/user/", headers=headers, timeout=15)
        check("Get current user", r.status_code == 200, f"email={r.json().get('email', '?')}")
    except Exception as exc:
        check("Get current user", False, str(exc))

    # 4. Organizations list
    try:
        r = session.get(f"{BASE}/accounts/organizations/", headers=headers, timeout=15)
        orgs = r.json()
        if isinstance(orgs, dict):
            orgs = orgs.get("results", [orgs])
        check("List organizations", r.status_code == 200 and len(orgs) >= 1, f"count={len(orgs)}")
    except Exception as exc:
        check("List organizations", False, str(exc))

    # 5. Regulations
    try:
        r = session.get(f"{BASE}/grc/regulations/?sector=Fintech", headers=headers, timeout=15)
        check("List regulations", r.status_code == 200, f"count={len(r.json()) if isinstance(r.json(), list) else '?'}")
    except Exception as exc:
        check("List regulations", False, str(exc))

    # 6. Reject assessment without logs
    try:
        r = session.post(
            f"{BASE}/grc/assessments/",
            headers=headers,
            json={"input_mode": "upload", "organization": org_id, "text_report": ""},
            timeout=15,
        )
        check("Reject empty logs", r.status_code == 400, f"status={r.status_code}")
    except Exception as exc:
        check("Reject empty logs", False, str(exc))

    # 6b. Export existing assessment (no auth required)
    try:
        r = session.get(f"{BASE}/grc/assessments/40/export_pdf/", timeout=15)
        ctype = r.headers.get("Content-Type", "")
        ok = r.status_code == 200 and len(r.content) > 500
        check("Export existing report", ok, f"status={r.status_code}, size={len(r.content)}, type={ctype}")
    except Exception as exc:
        check("Export existing report", False, str(exc))

    # 7. Reject manual-only (no logs)
    try:
        r = session.post(
            f"{BASE}/grc/assessments/",
            headers=headers,
            json={
                "input_mode": "manual",
                "organization": org_id,
                "kri_data": {"mfa_percentage": 90},
            },
            timeout=15,
        )
        check("Reject manual without logs", r.status_code == 400, f"status={r.status_code}")
    except Exception as exc:
        check("Reject manual without logs", False, str(exc))

    # 8. Create assessment from log file (text report)
    assessment_id = None
    log_text = (SAMPLES / "test.txt").read_text(encoding="utf-8")
    try:
        t0 = time.time()
        r = session.post(
            f"{BASE}/grc/assessments/",
            headers=headers,
            json={"input_mode": "upload", "organization": org_id, "text_report": log_text},
            timeout=TIMEOUT,
        )
        elapsed = time.time() - t0
        ok = r.status_code == 201
        detail = f"status={r.status_code}, {elapsed:.1f}s"
        if ok:
            data = r.json()
            assessment_id = data["id"]
            ai = data.get("ai_output") or {}
            detail += f", risk={data.get('risk_score', '?')}, ai_model={ai.get('model_used', 'none')}"
            check("Create assessment (log upload)", True, detail)
            check("AI output present", bool(ai.get("risk_explanation")), ai.get("model_used", "missing"))
            check("KRI records saved", len(data.get("kri_records", [])) > 0, f"count={len(data.get('kri_records', []))}")
            mfa = next((k["raw_value"] for k in data.get("kri_records", []) if k["kri_name"] == "MFA Coverage"), None)
            check("KRI extracted from logs (MFA ~94)", mfa is not None and 85 <= float(mfa) <= 99, f"mfa={mfa}")
            check("Compliance results", len(data.get("compliance_results", [])) > 0, f"count={len(data.get('compliance_results', []))}")
        elif r.status_code == 503:
            check("Create assessment (log upload)", False, "Gemini API quota exceeded — renew key or wait for daily reset")
    except Exception as exc:
        check("Create assessment (log upload)", False, str(exc))

    if not assessment_id:
        return report()

    # 9. Get assessment detail
    try:
        r = session.get(f"{BASE}/grc/assessments/{assessment_id}/", headers=headers, timeout=15)
        check("Get assessment detail", r.status_code == 200 and r.json().get("id") == assessment_id)
    except Exception as exc:
        check("Get assessment detail", False, str(exc))

    # 10. List assessments
    try:
        r = session.get(f"{BASE}/grc/assessments/", headers=headers, timeout=15)
        items = r.json()
        if isinstance(items, dict):
            items = items.get("results", items)
        check("List assessments", r.status_code == 200 and any(a.get("id") == assessment_id for a in items))
    except Exception as exc:
        check("List assessments", False, str(exc))

    # 11. Assessment report endpoint
    try:
        r = session.get(f"{BASE}/grc/assessments/{assessment_id}/report/", headers=headers, timeout=15)
        check("Assessment report", r.status_code == 200 and r.json().get("id") == assessment_id)
    except Exception as exc:
        check("Assessment report", False, str(exc))

    # 12. PDF/HTML export
    try:
        r = session.get(f"{BASE}/grc/assessments/{assessment_id}/export_pdf/", timeout=15)
        ctype = r.headers.get("Content-Type", "")
        ok = r.status_code == 200 and ("html" in ctype or "pdf" in ctype or len(r.content) > 500)
        check("Export PDF/HTML", ok, f"status={r.status_code}, type={ctype}, size={len(r.content)}")
    except Exception as exc:
        check("Export PDF/HTML", False, str(exc))

    # 13. AI recommendations
    try:
        r = session.get(f"{BASE}/ai/recommendations/{assessment_id}/", headers=headers, timeout=15)
        recs = r.json().get("recommendations", [])
        check("AI recommendations", r.status_code == 200, f"count={len(recs)}")
    except Exception as exc:
        check("AI recommendations", False, str(exc))

    # 14. KRI records endpoint
    try:
        r = session.get(f"{BASE}/grc/kri-records/", headers=headers, timeout=15)
        check("KRI records list", r.status_code == 200)
    except Exception as exc:
        check("KRI records list", False, str(exc))

    # 15. Compliance results endpoint
    try:
        r = session.get(f"{BASE}/grc/compliance-results/", headers=headers, timeout=15)
        check("Compliance results list", r.status_code == 200)
    except Exception as exc:
        check("Compliance results list", False, str(exc))

    # 16. JSON log upload path
    try:
        kri_json = json.loads((SAMPLES / "fintech_sample_kris.json").read_text())
        r = session.post(
            f"{BASE}/grc/assessments/",
            headers=headers,
            json={
                "input_mode": "upload",
                "organization": org_id,
                "text_report": json.dumps(kri_json),
            },
            timeout=TIMEOUT,
        )
        check("Create assessment (JSON log)", r.status_code == 201, f"status={r.status_code}")
    except Exception as exc:
        check("Create assessment (JSON log)", False, str(exc))

    return report()


def report():
    passed = sum(1 for _, s, _ in results if s == "PASS")
    failed = sum(1 for _, s, _ in results if s == "FAIL")
    print("\n" + "=" * 50)
    print(f"TOTAL: {passed} passed, {failed} failed, {len(results)} tests")
    print("=" * 50)
    if failed:
        print("\nFailed tests:")
        for name, status, detail in results:
            if status == "FAIL":
                print(f"  - {name}: {detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
