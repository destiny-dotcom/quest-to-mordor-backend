-- Quest to Mordor - Seed Data: LOTR Journey Milestones
-- Migration: 002_seed_milestones
-- Total Journey: ~1,779 miles from Bag End to Mount Doom

INSERT INTO milestones (name, description, distance_from_start, order_index, quote) VALUES

-- THE SHIRE
('Bag End',
 'Your journey begins at Bilbo''s home in Hobbiton. The road goes ever on and on...',
 0, 1,
 'It''s a dangerous business, Frodo, going out your door.'),

('Buckland',
 'Cross the Brandywine Bridge to reach the eastern border of the Shire.',
 20, 2,
 'Short cuts make long delays.'),

('Old Forest',
 'The ancient woodland where Tom Bombadil dwells. Beware Old Man Willow!',
 40, 3,
 'Hey dol! merry dol! ring a dong dillo!'),

-- ERIADOR
('Bree',
 'The village of Men and Hobbits where you first meet Strider at the Prancing Pony.',
 120, 4,
 'All that is gold does not glitter, not all those who wander are lost.'),

('Weathertop',
 'The ancient watchtower of Amon Sûl. Here the Nazgûl attacked the hobbits.',
 200, 5,
 'They were once Men. Great kings of Men. Then Sauron the Deceiver gave to them nine Rings of Power.'),

('Rivendell',
 'The Last Homely House East of the Sea. Home of Elrond and the forming of the Fellowship.',
 458, 6,
 'The Ring cannot be destroyed by any craft that we here possess.'),

-- MISTY MOUNTAINS & BEYOND
('Doors of Durin',
 'The western entrance to Moria. Speak friend and enter...',
 550, 7,
 'Mellon.'),

('Bridge of Khazad-dûm',
 'Deep within Moria, where Gandalf faced the Balrog. You shall not pass!',
 590, 8,
 'You cannot pass! I am a servant of the Secret Fire, wielder of the flame of Anor.'),

('Lothlórien',
 'The Golden Wood, realm of Galadriel and Celeborn. Rest and recover here.',
 650, 9,
 'Even the smallest person can change the course of the future.'),

('Amon Hen',
 'The Hill of Sight at Parth Galen. Here the Fellowship was broken.',
 750, 10,
 'I would have followed you, my brother... my captain... my king.'),

-- EMYN MUIL & THE DEAD MARSHES
('Emyn Muil',
 'The rocky labyrinth where Gollum first began guiding Frodo and Sam.',
 850, 11,
 'We wants it, we needs it. Must have the precious.'),

('Dead Marshes',
 'The haunted swampland filled with the fallen of ancient battles. Don''t follow the lights!',
 950, 12,
 'Don''t follow the lights.'),

-- APPROACH TO MORDOR
('Black Gate',
 'The Morannon - the main entrance to Mordor. Impassable by force.',
 1100, 13,
 'There is another way. More secret, more dark.'),

('Ithilien',
 'The fair garden of Gondor, where Faramir''s Rangers still patrol.',
 1200, 14,
 'The Ring will go to Gondor. It would be a gift... a gift to the foes of Mordor!'),

('Minas Morgul',
 'The Tower of Sorcery, once Minas Ithil. Home of the Witch-king.',
 1350, 15,
 'The way is shut. It was made by those who are Dead, and the Dead keep it.'),

('Cirith Ungol',
 'The Spider''s Pass. Shelob''s lair guards the secret entrance to Mordor.',
 1450, 16,
 'There''s some good in this world, Mr. Frodo... and it''s worth fighting for.'),

-- MORDOR
('Plateau of Gorgoroth',
 'The desolate plain within Mordor. The final stretch to Mount Doom.',
 1600, 17,
 'I can''t carry it for you, but I can carry you!'),

('Mount Doom',
 'Orodruin, the Crack of Doom. The only place where the Ring can be destroyed. Your journey is complete!',
 1779, 18,
 'I''m glad to be with you, Samwise Gamgee, here at the end of all things.');

-- ============================================
-- SEED ACHIEVEMENTS
-- ============================================
INSERT INTO achievements (name, description, requirement_type, requirement_value) VALUES

-- Milestone achievements
('First Steps', 'Leave the comfort of Bag End and begin your journey', 'milestone', 1),
('Friend of Tom Bombadil', 'Survive the Old Forest and meet the oldest', 'milestone', 3),
('Ranger''s Apprentice', 'Reach Bree and gain a guide for your journey', 'milestone', 4),
('Elf-friend', 'Reach the sanctuary of Rivendell', 'milestone', 6),
('Dwarf-friend', 'Pass through the Mines of Moria', 'milestone', 8),
('Lady''s Blessing', 'Receive the light of Eärendil in Lothlórien', 'milestone', 9),
('Ring-bearer', 'Enter the land of Mordor', 'milestone', 16),
('Destroyer of the Ring', 'Complete your quest at Mount Doom!', 'milestone', 18),

-- Step milestones
('Walking Hobbit', 'Walk 10,000 total steps', 'steps', 10000),
('Strider', 'Walk 100,000 total steps', 'steps', 100000),
('Marathon Walker', 'Walk 500,000 total steps', 'steps', 500000),
('Tireless Wanderer', 'Walk 1,000,000 total steps', 'steps', 1000000),

-- Streak achievements
('Consistent Walker', 'Log steps for 7 days in a row', 'streak', 7),
('Dedicated Traveler', 'Log steps for 30 days in a row', 'streak', 30),
('Fellowship Member', 'Log steps for 90 days in a row', 'streak', 90),
('Legendary Endurance', 'Log steps for 365 days in a row', 'streak', 365);
