import asyncio
import os
import sys
import time
import uuid
import httpx

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("ERROR: Missing required environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY.", file=sys.stderr)
    print("Please configure them in your environment before running acceptance tests.", file=sys.stderr)
    sys.exit(1)


async def register_user(email: str, password: str):
    async with httpx.AsyncClient() as client:
        # Register user
        res = await client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": password}
        )
        if res.status_code not in (200, 201):
            # If already exists or error, try login instead
            res = await client.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
                json={"email": email, "password": password}
            )
        data = res.json()
        return data.get("access_token"), data.get("user", {}).get("id")

async def run_tests():
    print("=== STARTING PHASE 4.1 ACCEPTANCE TESTS ===")
    
    # 1. Register test users
    user_a_email = f"user_a_{uuid.uuid4().hex[:6]}@example.com"
    user_b_email = f"user_b_{uuid.uuid4().hex[:6]}@example.com"
    password = "SuperPassword123!"
    
    print(f"Registering User A: {user_a_email}")
    token_a, id_a = await register_user(user_a_email, password)
    
    print(f"Registering User B: {user_b_email}")
    token_b, id_b = await register_user(user_b_email, password)
    
    if not token_a or not token_b:
        print("Registration failed, check Supabase credentials/network connectivity.")
        return
        
    print("Users registered successfully.\n")

    # 2. User Journey Timing
    print("=== MEASURING USER JOURNEY TIMINGS ===")
    
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    claim = "Astronomers discover a new planet made entirely of diamond just 40 light-years away."
    
    # T0: Submit claim
    t0 = time.time()
    print("T0: Submitting claim...")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{BACKEND_URL}/investigations",
            headers=headers_a,
            json={"content_type": "text", "raw_text": claim}
        )
        assert res.status_code == 201, f"Failed to submit claim: {res.text}"
        data = res.json()
        session_id = data["session_id"]
        
        # T1: Investigation created
        t1 = time.time()
        print(f"T1: Investigation session created (session_id={session_id}) in {t1 - t0:.2f} seconds.")
        
        # T2: Investigation page becomes interactive
        # We perform detail retrieval immediately
        res = await client.get(f"{BACKEND_URL}/investigations/{session_id}", headers=headers_a)
        assert res.status_code == 200
        t2 = time.time()
        print(f"T2: Detail retrieval successful/interactive in {t2 - t0:.2f} seconds. Status: {res.json()['status']}")
        
        # T3: First reaction UI usable
        # Post a reaction immediately to test interactive responsiveness during background task
        res_reaction = await client.post(
            f"{BACKEND_URL}/investigations/{session_id}/reflection",
            headers=headers_a,
            json={"initial_reaction": "unsure"}
        )
        assert res_reaction.status_code == 200
        t3 = time.time()
        print(f"T3: Initial reaction successfully saved while background processing runs in {t3 - t0:.2f} seconds.")
        
        # Poll for lenses, thinking questions, and synthesis
        t4, t5, t6, t7, t8 = None, None, None, None, None
        
        start_poll = time.time()
        while time.time() - start_poll < 120.0:  # Poll up to 2 minutes
            detail_res = await client.get(f"{BACKEND_URL}/investigations/{session_id}", headers=headers_a)
            thinking_res = await client.get(f"{BACKEND_URL}/investigations/{session_id}/thinking", headers=headers_a)
            
            assert detail_res.status_code == 200
            assert thinking_res.status_code == 200
            
            detail = detail_res.json()
            thinking = thinking_res.json()
            
            findings = detail.get("findings") or {}
            
            # Count completed lenses out of 5
            completed_lenses = []
            if findings.get("source"): completed_lenses.append("source")
            if findings.get("evidence"): completed_lenses.append("evidence")
            if findings.get("emotion"): completed_lenses.append("emotion")
            if thinking.get("context"): completed_lenses.append("context")
            if thinking.get("ai_lens"): completed_lenses.append("ai")
            
            # T4: First lens available
            if len(completed_lenses) >= 1 and t4 is None:
                t4 = time.time()
                print(f"T4: First lens ({completed_lenses[0]}) became available in {t4 - t0:.2f} seconds.")
                
            # T5: Second lens available
            if len(completed_lenses) >= 2 and t5 is None:
                t5 = time.time()
                print(f"T5: Second lens ({completed_lenses[1]}) became available in {t5 - t0:.2f} seconds.")
                
            # T6: Thinking questions available
            if thinking.get("thinking_questions") and len(thinking["thinking_questions"]) > 0 and t6 is None:
                t6 = time.time()
                print(f"T6: Thinking questions became available in {t6 - t0:.2f} seconds.")
                
            # T7: Synthesis available
            if findings.get("synthesis") and t7 is None:
                t7 = time.time()
                print(f"T7: Synthesis became available in {t7 - t0:.2f} seconds.")
                
            # T8: Complete
            if detail["status"] == "complete":
                t8 = time.time()
                print(f"T8: Entire analysis completed in {t8 - t0:.2f} seconds.")
                break
                
            if detail["status"] == "error":
                print(f"Investigation session failed during processing: {detail.get('error_message')}")
                break
                
            await asyncio.sleep(1.0)
            
        print("\n=== TIMING REPORT ===")
        print(f"T0 (Submission Start): 0.0s")
        print(f"T1 (Session Created): {t1 - t0:.2f}s")
        print(f"T2 (Interactive Page): {t2 - t0:.2f}s")
        print(f"T3 (First Reaction Sent): {t3 - t0:.2f}s")
        print(f"T4 (First Lens Available): {t4 - t0:.2f}s" if t4 else "T4: Not available")
        print(f"T5 (Second Lens Available): {t5 - t0:.2f}s" if t5 else "T5: Not available")
        print(f"T6 (Thinking Questions Available): {t6 - t0:.2f}s" if t6 else "T6: Not available")
        print(f"T7 (Synthesis Available): {t7 - t0:.2f}s" if t7 else "T7: Not available")
        print(f"T8 (Pipeline Complete): {t8 - t0:.2f}s" if t8 else "T8: Pipeline timeout or error")
        
        # 3. Security Isolation Tests
        print("\n=== VERIFYING SECURITY ISOLATION ===")
        
        # User B tries to view User A's session detail
        res_view = await client.get(f"{BACKEND_URL}/investigations/{session_id}", headers=headers_b)
        print(f"User B accessing User A's session: status_code={res_view.status_code} (Expected: 404 due to Supabase RLS policies)")
        assert res_view.status_code == 404, "Security violation: User B could access User A's session details!"
        
        # User B tries to get User A's thinking questions
        res_think = await client.get(f"{BACKEND_URL}/investigations/{session_id}/thinking", headers=headers_b)
        print(f"User B accessing User A's thinking questions: status_code={res_think.status_code} (Expected: 404)")
        assert res_think.status_code == 404, "Security violation: User B could access User A's thinking questions!"
        
        # User B tries to retry User A's session
        res_retry_b = await client.post(f"{BACKEND_URL}/investigations/{session_id}/retry", headers=headers_b)
        print(f"User B retrying User A's session: status_code={res_retry_b.status_code} (Expected: 404)")
        assert res_retry_b.status_code == 404, "Security violation: User B could trigger a retry on User A's session!"
        
        print("Security isolation verified successfully.")

        # 4. Retry Validation
        print("\n=== VERIFYING RETRY FUNCTIONALITY ===")
        res_retry_a = await client.post(f"{BACKEND_URL}/investigations/{session_id}/retry", headers=headers_a)
        assert res_retry_a.status_code == 200
        retry_data = res_retry_a.json()
        print(f"User A retried successfully. Reset status is: {retry_data['status']}")
        assert retry_data["status"] == "pending", "Status was not reset to pending!"
        
        # Wait a bit to ensure it resets and begins processing again
        await asyncio.sleep(2.0)
        res_check = await client.get(f"{BACKEND_URL}/investigations/{session_id}", headers=headers_a)
        print(f"Investigation session status after 2 seconds: {res_check.json()['status']}")
        
    print("\nAcceptance testing script executed cleanly.")

if __name__ == "__main__":
    asyncio.run(run_tests())
