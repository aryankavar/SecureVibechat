const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = 'gcf-sources-109401183858-us-central1';
const role = 'roles/storage.objectViewer';
const member = 'serviceAccount:109401183858-compute@developer.gserviceaccount.com';

async function main() {
  try {
    console.log(`Getting IAM policy for bucket ${bucketName}...`);
    const [policy] = await storage.bucket(bucketName).iam.getPolicy({requestedPolicyVersion: 3});
    
    // Add the new role
    policy.bindings.push({
      role: role,
      members: [member],
    });
    
    console.log(`Setting new IAM policy...`);
    await storage.bucket(bucketName).iam.setPolicy(policy);
    console.log(`Successfully granted ${role} to ${member}`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
