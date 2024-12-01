const { chromium } = require('playwright');
const { exec } = require('child_process');
const fs = require('fs');
const AWS = require('aws-sdk');

// Configuration
const RECORDING_PATH = '/tmp/meeting.mp4';
const AUDIO_PATH = '/tmp/meeting_audio.mp3';
const BUCKET_NAME = 'mybucket-aws-vaktra01';

// AWS S3 Setup
const s3 = new AWS.S3({
  region: 'eu-north-1',
  accessKeyId: 'AKIARZ5BM6TEQBKJKFWZ', // Use IAM role in production for security
  secretAccessKey: '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',
});

// Upload file to S3
async function uploadToS3(filePath, key) {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
  };

  return s3.upload(params).promise();
}

// Main Bot Function
(async () => {
  // Read meeting URL from CLI
  const meetingUrl = process.argv[2];
  if (!meetingUrl) {
    console.error('Error: Meeting URL not provided.');
    process.exit(1);
  }

  const  meetlink = meetingUrl;
 


  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Open meeting page
    console.log(`Joining meeting at ${meetingUrl}`);
    console.log(`Joining meeting at ${meetlink}`);
    await page.goto(meetlink);

    // Add custom logic if login or permissions are needed
    // Example: Handling camera/microphone permissions
    // await context.grantPermissions(['camera', 'microphone']);
     await page.goto(meetlink, { waitUntil: 'domcontentloaded' });  // Wait until the DOM content is loaded
// Wait for the network to become idle or the DOM content to load
await page.waitForLoadState('networkidle'); // Wait for the network to be idle

	await page.screenshot({ path: 'debug-screenshot11.png' });
         await page.locator('button[data-tid="joinOnWeb"]').click();
     await page.screenshot({ path: 'debug-screenshot12.png' });
     await page.locator('[data-tid="second-step"]~button[type="button"]').click();
     await page.screenshot({ path: 'debug-screenshot13.png' });
     await page.locator('[data-tid="prejoin-display-name-input"]').fill('Vaktra AI Notetaker');
     await page.screenshot({ path: 'debug-screenshot14.png' });
     await page.locator('[data-tid="prejoin-join-button"]').click();
     await page.screenshot({ path: 'debug-screenshot15.png' });

//await page.waitForLoadState(LoadState.NETWORKIDLE);
   // const iframe = await page.frameLocator('iframe[id="webclient"]');





// Wait for the password field

// await iframe.locator('[id="input-for-pwd"]').fill(meetpass);

// // Wait for and fill in the name field

// await iframe.locator('#input-for-name').fill('Vaktra AI Notetaker');


// await iframe.locator('.preview-video__control-button[aria-label="Join Audio"]').click();

// // Click the "Join" button

// await iframe.locator('button[type="button"]').click();







    // Start FFmpeg to record the screen
    console.log('Starting screen recording...');
    const ffmpegProcess = exec(
      `ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -i :99.0 -c:v libx264 ${RECORDING_PATH}`
    );

    // Simulate meeting duration (adjust as needed)
    await page.waitForTimeout(630000); // 30 seconds

    // Stop recording
    console.log('Stopping recording...');
    ffmpegProcess.kill('SIGINT');

    // Wait for FFmpeg to finish
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extract audio from the recording
    console.log('Extracting audio...');
    exec(`ffmpeg -i ${RECORDING_PATH} -q:a 0 -map a ${AUDIO_PATH}`, async (err) => {
      if (err) {
        console.error('Error extracting audio:', err);
        return;
      }

      console.log('Audio extraction complete.');

      // Upload recording to S3
      console.log('Uploading files to S3...');
      try {
        await uploadToS3(RECORDING_PATH, 'recordings/meeting.mp4');
        console.log('Recording uploaded.');

        await uploadToS3(AUDIO_PATH, 'audio/meeting_audio.mp3');
        console.log('Audio uploaded.');

        console.log('All files successfully uploaded to S3.');
      } catch (uploadErr) {
        console.error('Error uploading to S3:', uploadErr);
      }

      // Close the browser
      await browser.close();
    });
  } catch (error) {
    console.error('Error during meeting recording:', error);
    await browser.close();
  }
})();
