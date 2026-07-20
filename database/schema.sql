-- HarvestLanka Database Schema
-- Use this file to set up your MySQL database.

CREATE DATABASE IF NOT EXISTS harvestlanka_db;
USE harvestlanka_db;

-- 1. Users Table (Managers, Customers, Drivers)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Hashed password for security
    role VARCHAR(20) NOT NULL,       -- 'manager', 'customer', 'driver'
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Items (Products) Table
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,      -- Selling Price
    cost_price DECIMAL(10, 2) NOT NULL, -- Cost Price (to calculate profit)
    weight DECIMAL(6, 2) NOT NULL,      -- Weight in kilograms (e.g. 5.00 kg)
    stock INT DEFAULT 100,
    image_url VARCHAR(255) DEFAULT '/static/images/default.jpg'
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    address_line1 VARCHAR(100) NOT NULL,
    address_line2 VARCHAR(100) NOT NULL,
    total_weight DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL, -- Saved total bill
    total_cost DECIMAL(10, 2) NOT NULL,  -- Sum of item cost prices * quantities
    profit DECIMAL(10, 2) NOT NULL,      -- total_price - total_cost
    suggested_vehicle VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'offered', 'accepted', 'declined', 'delivered'
    driver_id INT DEFAULT NULL,          -- Assigned driver
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- 4. Order Items (Details) Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 5. Drivers Specific Details Table
CREATE TABLE IF NOT EXISTS drivers (
    user_id INT PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'busy', 'offline'
    area VARCHAR(100) NOT NULL,            -- e.g. "Anuradhapura"
    warehouse VARCHAR(100) NOT NULL,       -- selected warehouse hub
    vehicle_type VARCHAR(50) NOT NULL,     -- e.g. "Motorbike"
    license_no VARCHAR(50) NOT NULL,       -- Driver's license number
    home_address TEXT NOT NULL,            -- Home address
    lat DECIMAL(10, 8) DEFAULT 8.3122,     -- Mock coordinates around Anuradhapura, Sri Lanka
    lng DECIMAL(10, 8) DEFAULT 80.4131,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Insert Mock Items (For immediate testing)
INSERT INTO items (name, description, price, cost_price, weight, stock, image_url) VALUES
('Premium Basmati Rice (5kg)', 'High-quality long-grain Basmati rice, perfect for everyday meals.', 1250.00, 950.00, 5.00, 100, '/static/images/rice.jpg'),
('Refined White Sugar (1kg)', 'Pure white crystalline sugar, locally sourced.', 320.00, 260.00, 1.00, 150, '/static/images/sugar.jpg'),
('Red Dhal - Mysloor (1kg)', 'Premium split red lentils, clean and high protein.', 480.00, 390.00, 1.00, 200, '/static/images/dhal.jpg'),
('Ceylon Black Tea (250g)', 'Rich and aromatic premium black tea from Sri Lankan estates.', 650.00, 500.00, 0.25, 80, '/static/images/tea.jpg'),
('Coconut Oil Pure (1L)', '100% natural cold-pressed coconut oil for cooking.', 980.00, 800.00, 0.90, 120, '/static/images/coconut_oil.jpg');
