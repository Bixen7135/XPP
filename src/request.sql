
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    is_admin BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id)
);


ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);


CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);


CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, email)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        new.email
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


CREATE TABLE user_settings (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    is_admin BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id)
);


ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can view own settings" 
    ON user_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
    ON user_settings FOR UPDATE 
    USING (auth.uid() = user_id);


CREATE OR REPLACE FUNCTION public.handle_new_profile() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (new.id);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();


CREATE INDEX profiles_username_idx ON profiles(username);
CREATE INDEX profiles_email_idx ON profiles(email);


CREATE ROLE admin;


CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    answers JSONB,
    correct_answer TEXT,
    explanation TEXT,
    context TEXT,
    instructions TEXT,
    learning_outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    deleted_at TIMESTAMP WITH TIME ZONE
);


ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can view own non-deleted tasks" 
    ON tasks FOR SELECT 
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create tasks" 
    ON tasks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" 
    ON tasks FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" 
    ON tasks FOR DELETE 
    USING (auth.uid() = user_id);


CREATE TABLE exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty_distribution JSONB,
    total_questions INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);


CREATE TABLE exam_questions (
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    question_order INTEGER,
    PRIMARY KEY (exam_id, task_id)
);


ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can view own exams" 
    ON exams FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create exams" 
    ON exams FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exams" 
    ON exams FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exams" 
    ON exams FOR DELETE 
    USING (auth.uid() = user_id);


CREATE POLICY "Users can view own exam questions" 
    ON exam_questions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_questions.exam_id 
            AND exams.user_id = auth.uid()
        )
    );


CREATE INDEX tasks_user_id_idx ON tasks(user_id);
CREATE INDEX tasks_type_idx ON tasks(type);
CREATE INDEX tasks_topic_idx ON tasks(topic);
CREATE INDEX exams_user_id_idx ON exams(user_id);
CREATE INDEX exam_questions_exam_id_idx ON exam_questions(exam_id);
CREATE INDEX exam_questions_task_id_idx ON exam_questions(task_id);


CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    TO admin
    USING (true);

CREATE POLICY "Admins can view all tasks including deleted"
    ON tasks FOR SELECT
    TO admin
    USING (true);

CREATE POLICY "Admins can view all exams"
    ON exams FOR SELECT
    TO admin
    USING (true);


CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE POLICY "Users can create exam questions" 
    ON exam_questions FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_id 
            AND exams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete exam questions" 
    ON exam_questions FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_id 
            AND exams.user_id = auth.uid()
        )
    );


CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    TO admin
    USING (true);

CREATE POLICY "Admins can delete all profiles"
    ON profiles FOR DELETE
    TO admin
    USING (true);

CREATE POLICY "Admins can manage all tasks"
    ON tasks FOR ALL
    TO admin
    USING (true);

CREATE POLICY "Admins can manage all exams"
    ON exams FOR ALL
    TO admin
    USING (true);

CREATE POLICY "Admins can manage all exam questions"
    ON exam_questions FOR ALL
    TO admin
    USING (true);


GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;

CREATE OR REPLACE FUNCTION make_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can make other users admins';
    END IF;
    
    UPDATE profiles 
    SET is_admin = true 
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION remove_admin(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can remove admin privileges';
    END IF;
    
    UPDATE profiles 
    SET is_admin = false 
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


INSERT INTO storage.buckets (id, name)
VALUES ('avatars', 'avatars');


CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);


CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);


CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');


CREATE TABLE task_sheets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tasks UUID[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);


ALTER TABLE task_sheets ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can view own task sheets" 
    ON task_sheets FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create task sheets" 
    ON task_sheets FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task sheets" 
    ON task_sheets FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task sheets" 
    ON task_sheets FOR DELETE 
    USING (auth.uid() = user_id);


CREATE INDEX task_sheets_user_id_idx ON task_sheets(user_id);

ALTER TABLE task_sheets 
ALTER COLUMN tasks SET DEFAULT '{}';


UPDATE task_sheets 
SET tasks = '{}'::uuid[] 
WHERE tasks IS NULL;


ALTER TABLE task_sheets 
ALTER COLUMN tasks SET NOT NULL;


ALTER TABLE task_sheets 
DROP CONSTRAINT IF EXISTS task_sheets_tasks_check;


ALTER TABLE task_sheets 
ADD CONSTRAINT task_sheets_tasks_check 
CHECK (tasks IS NOT NULL);


CREATE INDEX task_sheets_tasks_gin_idx ON task_sheets USING gin(tasks);


CREATE OR REPLACE FUNCTION validate_task_ids()
RETURNS TRIGGER AS $$
BEGIN
  
  IF EXISTS (
    SELECT 1
    FROM unnest(NEW.tasks) AS task_id
    LEFT JOIN tasks ON tasks.id = task_id
    WHERE tasks.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid task ID found in tasks array';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_task_sheet_tasks
BEFORE INSERT OR UPDATE ON task_sheets
FOR EACH ROW
EXECUTE FUNCTION validate_task_ids();
