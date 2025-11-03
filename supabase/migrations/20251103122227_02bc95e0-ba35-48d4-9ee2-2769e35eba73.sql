-- Enable realtime for program_schedule table
ALTER TABLE public.program_schedule REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_schedule;