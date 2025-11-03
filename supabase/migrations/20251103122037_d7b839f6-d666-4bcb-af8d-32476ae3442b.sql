-- Add foreign key relationship between program_schedule and video_assets
ALTER TABLE public.program_schedule 
ADD CONSTRAINT program_schedule_asset_id_fkey 
FOREIGN KEY (asset_id) 
REFERENCES public.video_assets(id) 
ON DELETE SET NULL;