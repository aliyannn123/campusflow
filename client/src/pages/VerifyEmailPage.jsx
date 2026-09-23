function VerifyEmailPage() {
  return (
    <main>
      <h1>Verify Your Email</h1>

      <p>
        Enter the 6-digit verification code sent to
        your college email.
      </p>

      <form>
        <div>
          <label htmlFor="otp">
            Verification Code
          </label>

          <input
            id="otp"
            type="text"
            placeholder="123456"
            maxLength={6}
          />
        </div>

        <button type="submit">
          Verify Email
        </button>
      </form>

      <button type="button">
        Resend Code
      </button>
    </main>
  );
}

export default VerifyEmailPage;