import { S3 } from 'aws-sdk';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const unlinkAsync = promisify(fs.unlink); // Convert fs.unlink to a promise-based function
const writeFileAsync = promisify(fs.writeFile);

// Function to generate a unique filename
const generateUniqueFileName = (originalname: string): string => {
  const uniqueSuffix = Date.now() + '-' + uuidv4(); // Timestamp and UUID
  const ext = path.extname(originalname); // Get file extension
  return `${uniqueSuffix}${ext}`; // Return unique filename with the original extension
};

export const dynamicFileUpload = async (
  file: Express.Multer.File
): Promise<{ filePath: string; fileUrl: string; message: string }> => {
  const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_BUCKET_NAME;

  // Generate a unique filename
  const uniqueFileName = generateUniqueFileName(file.originalname);

  if (awsSecretKey && bucketName) {
    const s3 = new S3();

    // Upload the file to S3 using the unique filename
    const uploadResult = await s3
      .upload({
        Bucket: bucketName!,
        Key: uniqueFileName, // Use the unique file name as the key in S3
        Body: file.buffer, // File buffer directly from Multer (if memory storage is used)
        ACL: 'public-read', // Make the file publicly accessible
        ContentType: file.mimetype, // Set the MIME type of the file
      })
      .promise();

    const filePath = uniqueFileName;
    const fileUrl = uploadResult.Location;
    const message = 'File uploaded to S3 successfully';

    return { filePath, fileUrl, message };
  }

  // Fallback to local storage
  const localUploadDir = path.join(__dirname, '../../uploads');

  // Ensure the uploads directory exists
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }

  const localFilePath = path.join(localUploadDir, uniqueFileName); // Use unique filename for local storage
  await writeFileAsync(localFilePath, file.buffer);

  const baseUrl = process.env.BACKEND_BASE_URL;
  const filePath = `uploads/${uniqueFileName}`; // Store relative path
  const fileUrl = `${baseUrl}/${filePath}`; // Full URL for access
  const message = 'File uploaded locally successfully';

  return { filePath, fileUrl, message };
};

// Delete file either from S3 or local storage
// export const deleteFile = async (filePath: string): Promise<string> => {
//   const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
//   const bucketName = process.env.AWS_BUCKET_NAME;

//   if (awsSecretKey && bucketName) {
//     const s3 = new S3();

//     const params = {
//       Bucket: bucketName!,
//       Key: filePath, // filePath here is the S3 key (usually the filename or path within the bucket)
//     };

//     try {
//       console.error('==========s3');
//       console.log(await s3.deleteObject(params).promise());
//       const successMessage = `File deleted from S3: ${filePath}`;
//       console.log(successMessage);
//       return successMessage;
//     } catch (error) {
//       const errorMessage = `Error deleting file from S3: ${filePath}, Error: ${error.message}`;
//       console.error(errorMessage);
//       return errorMessage;
//     }
//   } else {
//     // Delete from local storage
//     const fullFilePath = `./${filePath}`; // Ensure the path is relative to the project root
//     try {
//       await unlinkAsync(fullFilePath);
//       const successMessage = `File deleted from local storage: ${fullFilePath}`;
//       console.log(successMessage);
//       return successMessage;
//     } catch (error) {
//       const errorMessage = `Error deleting file from local storage: ${fullFilePath}, Error: ${error.message}`;
//       console.error(errorMessage);
//       return errorMessage;
//     }
//   }
// };
export const deleteFile = async (filePath: string): Promise<string> => {
  const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_BUCKET_NAME;

  // Check if the filePath starts with "uploads/" to determine local or S3 storage
  if (filePath.startsWith('uploads/')) {
    const fullFilePath = `./${filePath}`; // Ensure the path is relative to the project root
    try {
      await unlinkAsync(fullFilePath);
      const successMessage = `File deleted from local storage: ${fullFilePath}`;
      console.log(successMessage);
      return successMessage;
    } catch (error) {
      const errorMessage = `Error deleting file from local storage: ${fullFilePath}, Error: ${error.message}`;
      console.error(errorMessage);
      return errorMessage;
    }
  } else {
    // S3 file deletion
    if (awsSecretKey && bucketName) {
      const s3 = new S3();
      const params = {
        Bucket: bucketName!,
        Key: filePath, // filePath here is the S3 key (usually the filename or path within the bucket)
      };

      try {
        await s3.deleteObject(params).promise();
        const successMessage = `File deleted from S3: ${filePath}`;
        console.log(successMessage);
        return successMessage;
      } catch (error) {
        const errorMessage = `Error deleting file from S3: ${filePath}, Error: ${error.message}`;
        console.error(errorMessage);
        return errorMessage;
      }
    } else {
      const errorMessage = 'AWS credentials or bucket name not configured';
      console.error(errorMessage);
      // return errorMessage;
      throw new Error(errorMessage);
    }
  }
};
