# Research Log passkey shortcut

This feature is an optional local shortcut for the existing encrypted Mission Log, not a server account or authorization system.

## User flow
- On the protected archive page, enter the archive password and select **Set up passkey**. The archive must decrypt successfully before any credential is created.
- Use the device's passkey dialog (Windows Hello on compatible Windows devices). Setup creates the credential, derives the wrapping key through an unlock assertion, then performs another assertion to decrypt the proposed envelope before saving it. Complete all three device prompts. Both key derivation and verification use the same assertion path as later unlocks; creation-time PRF output is not used.
- Later, **Unlock with passkey** requests user verification and uses PRF-derived key material to decrypt the local shortcut, then fetches and decrypts the current archive.
- **Unlock with password** remains available. **Lock log** removes decrypted data and resets the archive interface. Navigation and BFCache departure retain the existing relock behavior.
- **Forget this browser** removes the local encrypted shortcut only. Deleting the credential itself is done in the system passkey manager.

## Cryptographic boundary
WebAuthn requests platform credentials, discoverability, and required user verification. The client checks origin, challenge, RP ID hash, UP/UV flags and the expected credential ID. PRF output feeds HKDF-SHA-256; the derived AES-256-GCM wrapping key is non-extractable. Authenticated additional data binds the envelope to this origin, archive URL, purpose/version and credential ID.

Only the encrypted password envelope, random PRF input/IV, version and credential metadata are persisted in localStorage. No plaintext password, PRF output, wrapping key, or decrypted archive is persisted. Keeping the password encrypted (rather than the archive-specific derived key) allows normal archive republishes with a new salt to work without rebinding.

This does not make trusted same-origin JavaScript immune to XSS or a compromised deployment. Password-based archive encryption and the existing password fallback are unchanged.

## Compatibility and recovery
A WebAuthn-capable browser is not proof that the selected authenticator supports PRF. Inspect actual extension results, fail closed on unsupported PRF, and retain password access. Creation success alone never marks the browser as linked: a separate assertion must decrypt the proposed envelope, with a byte-for-byte plaintext check, before storage. If verification or cancellation interrupts setup, no link is saved. Never substitute an unencrypted local key behind a biometric prompt.

The local encrypted envelope is not synced even if a provider syncs its passkey. Clearing site data, switching browser profiles or changing the archive password requires relinking. Keep the archive password for recovery.

Localhost and the production domain are separate WebAuthn relying parties. Real Windows Hello enrollment and compatibility must be tested by the user at the final production origin. Automated tests use synthetic archives and simulated credential responses; they do not establish native Windows Hello PRF support.

A failed unlock distinguishes device verification (PK-CREATE-* for registration, PK-GET-* for an assertion; PK-VERIFY for an unclassified older response), local encrypted-envelope decryption (PK-LOCAL), enrollment verification (PK-SETUP), and a saved password that cannot decrypt the current archive (PK-ARCHIVE). These codes contain no credential identifiers or secret material. Existing invalid links can be removed with **Forget this browser** and enrolled again using the current archive password.

## Verification
- node --test scripts/research-passkey.test.mjs scripts/research-lock.test.mjs
- node scripts/research-passkey.browser.test.mjs (PLAYWRIGHT_MODULE and EDGE_EXECUTABLE configured)
- node scripts/research-passkey-virtual.browser.test.mjs exercises the native Chromium WebAuthn API with a virtual CTAP2 authenticator, including real PRF derivation, reload/unlock, and unsupported-PRF rejection. This does not verify the user’s Windows Hello provider.
- Existing protected publisher/index/lightbox/mobile tests, Astro build, PPT export and site check.

References:
- https://learn.microsoft.com/en-us/windows/security/identity-protection/passkeys/
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions#prf
- https://developers.yubico.com/WebAuthn/Concepts/PRF_Extension/Developers_Guide_to_PRF.html

Verification codes identify the failed check: credential type/ID/size, client JSON/type/origin/challenge/cross-origin context, authenticator data, RP hash, presence (UP), or verification (UV). Only fixed codes reach the error message; no response bytes, credential IDs, passwords, or PRF output are logged or sent. A PK-VERIFY report alone is insufficient to identify a Windows Hello provider issue. Collect the specific code at the production origin before changing validation or claiming compatibility.
