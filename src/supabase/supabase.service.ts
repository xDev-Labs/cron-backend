import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) { }

  onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !anonKey) {
      throw new Error(
        'Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY\n' +
        'Please create a .env file with these variables.',
      );
    }

    this.supabase = createClient(url, anonKey);
    console.log('✅ Supabase connected successfully!');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async uploadAvatar(
    fileBuffer: Buffer,
    userId: string,
    fileExtension: string,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const fileName = `${userId}.${fileExtension}`;
      const bucketName = 'users';

      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
          contentType: this.getContentType(fileExtension),
          upsert: true, // Allow overwriting existing files
        });

      console.log('data', data);

      if (error) {

        console.error('Supabase upload error:', error);
        return {
          success: false,
          error: `Failed to upload file: ${error.message}`,
        };
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error) {
      console.error('Avatar upload error:', error);
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }
  }

  private getContentType(fileExtension: string): string {
    const extension = fileExtension.toLowerCase();
    const contentTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return contentTypes[extension] || 'image/jpeg';
  }
}
