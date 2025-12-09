# Veo Video Studio

![Preview](assets/preview.png)

https://github.com/user-attachments/assets/b2a063e6-5751-458b-822e-53f125f9b0a7

https://github.com/merginit/veo-video-studio/raw/refs/heads/main/assets/Crystal_Slime_Cube_Impact.mp4

https://github.com/user-attachments/assets/d5eaaf76-b5b4-4e60-9c4e-ab1904b7ea5a

https://github.com/merginit/veo-video-studio/raw/refs/heads/main/assets/Slime_and_Honeycomb_Crunch_Video.mp4

https://github.com/user-attachments/assets/9bde373d-fec1-4ee6-bda5-7b43ff480716

https://github.com/merginit/veo-video-studio/raw/refs/heads/main/assets/Deep_Space_Pearl_Swirl_Video_Generation.mp4

## Run Locally

1. Install dependencies:
   `bun install`
2. Run the app:
   `bun run dev`

## Authenticate with Google Cloud

- Upload your Google Cloud Service Account JSON in the app's lock screen to authenticate.
- The key is processed locally in your browser and never sent to any server.
- Required fields: `type`, `project_id`, `private_key_id`, `private_key`, `client_email`, `client_id`, `auth_uri`, `token_uri`, `auth_provider_x509_cert_url`, `client_x509_cert_url`, `universe_domain`.

## Production Notes

- Keep credentials in memory only and clear when disconnecting.
- Use HTTPS and a secure origin to enable WebCrypto for JWT signing.
