import { parseCSVString } from './dataEngine/csvParser';
import { Dataset } from '../types';

export const ECOMMERCE_SALES_CSV = `Order_ID,Order_Date,Region,Category,Sub_Category,Product_Name,Customer_Segment,Sales,Profit,Discount,Quantity
ORD-2024-1001,2024-01-15,North America,Technology,Phones,iPhone 15 Pro,Enterprise,1199.99,350.50,0.05,2
ORD-2024-1002,2024-01-18,Europe,Technology,Laptops,MacBook Pro M3,Consumer,2499.00,620.00,0.00,1
ORD-2024-1003,2024-01-22,Asia-Pacific,Furniture,Chairs,Ergonomic Mesh Chair,Corporate,320.50,75.20,0.10,4
ORD-2024-1004,2024-01-28,North America,Office Supplies,Paper,Premium Multipurpose Paper,Consumer,45.00,12.50,0.00,5
ORD-2024-1005,2024-02-04,Latin America,Technology,Accessories,Wireless Mechanical Keyboard,Corporate,150.00,42.00,0.15,2
ORD-2024-1006,2024-02-09,Europe,Furniture,Tables,Oak Conference Table,Enterprise,1450.00,-120.00,0.25,1
ORD-2024-1007,2024-02-14,North America,Technology,Phones,Pixel 8 Pro,Consumer,999.00,280.00,0.05,1
ORD-2024-1008,2024-02-19,Asia-Pacific,Office Supplies,Storage,Modular Filing Cabinet,Enterprise,420.00,98.00,0.00,2
ORD-2024-1009,2024-02-25,North America,Technology,Laptops,Dell XPS 15,Corporate,1899.00,410.00,0.10,3
ORD-2024-1010,2024-03-02,Europe,Office Supplies,Binders,Heavy-Duty Ring Binders,Consumer,28.50,8.20,0.00,6
ORD-2024-1011,2024-03-08,North America,Furniture,Chairs,Executive Leather Recliner,Corporate,680.00,185.00,0.05,2
ORD-2024-1012,2024-03-14,Asia-Pacific,Technology,Phones,Galaxy S24 Ultra,Consumer,1299.99,340.00,0.08,2
ORD-2024-1013,2024-03-21,Latin America,Office Supplies,Paper,Recycled Copy Paper,Corporate,38.00,9.50,0.00,4
ORD-2024-1014,2024-03-29,North America,Technology,Accessories,Noise-Cancelling Headset,Enterprise,349.00,110.00,0.10,5
ORD-2024-1015,2024-04-03,Europe,Technology,Laptops,Lenovo ThinkPad X1,Corporate,1750.00,440.00,0.05,2
ORD-2024-1016,2024-04-11,North America,Furniture,Bookcases,Solid Walnut Bookshelf,Consumer,890.00,210.00,0.00,1
ORD-2024-1017,2024-04-18,Asia-Pacific,Technology,Accessories,4K Ultra-Wide Monitor,Enterprise,799.00,225.00,0.12,3
ORD-2024-1018,2024-04-25,Latin America,Furniture,Tables,Adjustable Standing Desk,Corporate,550.00,130.00,0.10,2
ORD-2024-1019,2024-05-02,North America,Technology,Phones,iPhone 15 Pro,Corporate,2399.98,710.00,0.05,2
ORD-2024-1020,2024-05-09,Europe,Office Supplies,Appliances,Compact Beverage Cooler,Consumer,310.00,65.00,0.15,1
ORD-2024-1021,2024-05-16,Asia-Pacific,Technology,Laptops,MacBook Air M2,Consumer,1099.00,290.00,0.00,2
ORD-2024-1022,2024-05-23,North America,Office Supplies,Art,Precision Drafting Pens,Consumer,55.00,18.00,0.00,4
ORD-2024-1023,2024-05-30,Europe,Technology,Phones,Pixel 8 Pro,Enterprise,1998.00,570.00,0.05,2
ORD-2024-1024,2024-06-05,Latin America,Furniture,Chairs,Ergonomic Task Stool,Consumer,190.00,42.00,0.05,2
ORD-2024-1025,2024-06-12,North America,Technology,Accessories,Thunderbolt 4 Docking Station,Corporate,280.00,85.00,0.00,3
ORD-2024-1026,2024-06-19,Asia-Pacific,Furniture,Tables,Glass Top Drafting Table,Enterprise,920.00,-85.00,0.20,1
ORD-2024-1027,2024-06-26,Europe,Technology,Laptops,Dell XPS 13,Consumer,1399.00,320.00,0.05,1
ORD-2024-1028,2024-07-03,North America,Office Supplies,Envelopes,Security Tint Mailers,Corporate,65.00,22.00,0.00,10
ORD-2024-1029,2024-07-10,Asia-Pacific,Technology,Phones,iPhone 15,Corporate,1598.00,380.00,0.10,2
ORD-2024-1030,2024-07-17,North America,Technology,Laptops,MacBook Pro M3 Max,Enterprise,3999.00,1050.00,0.00,2
ORD-2024-1031,2024-07-24,Europe,Furniture,Chairs,Steelcase Gesture Chair,Corporate,1280.00,340.00,0.05,2
ORD-2024-1032,2024-07-31,Latin America,Technology,Accessories,Mechanical NumPad,Consumer,65.00,18.50,0.00,2
ORD-2024-1033,2024-08-07,North America,Office Supplies,Fasteners,Industrial Heavy Stapler,Consumer,42.00,14.00,0.00,3
ORD-2024-1034,2024-08-14,Asia-Pacific,Technology,Laptops,ASUS ROG Strix,Consumer,2199.00,480.00,0.05,1
ORD-2024-1035,2024-08-21,Europe,Office Supplies,Paper,Heavyweight Presentation Cardstock,Corporate,88.00,28.00,0.00,5
ORD-2024-1036,2024-08-28,North America,Technology,Phones,Galaxy S24,Corporate,799.00,195.00,0.05,2
ORD-2024-1037,2024-09-04,Latin America,Furniture,Bookcases,Wall Mounted Floating Shelves,Consumer,260.00,62.00,0.00,2
ORD-2024-1038,2024-09-11,North America,Technology,Accessories,Curved Gaming Monitor,Consumer,649.00,165.00,0.10,1
ORD-2024-1039,2024-09-18,Europe,Technology,Laptops,ThinkPad T14s,Enterprise,1620.00,390.00,0.05,4
ORD-2024-1040,2024-09-25,Asia-Pacific,Furniture,Chairs,Herman Miller Aeron,Enterprise,1540.00,430.00,0.00,2`;

export const SAAS_CHURN_CSV = `Account_ID,Company_Name,Plan_Tier,Monthly_Recurring_Revenue,Active_Users,Usage_Hours_Mo,Support_Tickets_Qtr,NPS_Score,Churn_Status,Region,Signup_Date
ACC-5001,Apex Digital,Enterprise,4800,145,1820,3,9,Active,North America,2022-03-15
ACC-5002,Vortex BioTech,Enterprise,6500,210,2450,1,10,Active,Europe,2021-11-20
ACC-5003,BlueShift Media,Pro,950,28,340,7,4,Churned,North America,2023-05-12
ACC-5004,Nova Logistics,Enterprise,5200,160,1950,2,8,Active,Asia-Pacific,2022-08-01
ACC-5005,Quasar Studio,Starter,199,6,75,4,6,Active,Europe,2023-09-18
ACC-5006,Helios Fintech,Enterprise,7800,320,3800,4,9,Active,North America,2021-04-10
ACC-5007,Pulse Health,Pro,1200,35,410,9,3,Churned,Europe,2023-01-22
ACC-5008,Terra Green,Starter,199,4,45,2,7,Active,Latin America,2023-11-05
ACC-5009,Omni Retailers,Enterprise,4200,125,1600,0,9,Active,North America,2022-06-30
ACC-5010,Zenith Robotics,Enterprise,8900,410,4900,5,10,Active,Asia-Pacific,2020-09-14
ACC-5011,Krypton Security,Pro,1450,42,560,6,5,Churned,North America,2022-10-18
ACC-5012,Lumina Design,Starter,249,8,110,1,8,Active,Europe,2023-08-09
ACC-5013,Cobalt Analytics,Pro,1600,48,620,3,8,Active,North America,2022-12-04
ACC-5014,Solaris Solar,Pro,1150,30,380,8,2,Churned,Latin America,2023-04-17
ACC-5015,Titan Capital,Enterprise,9500,500,5600,2,10,Active,Europe,2020-01-28
ACC-5016,Velocity Delivery,Pro,1350,38,490,4,7,Active,Asia-Pacific,2023-02-14
ACC-5017,Echo Acoustic,Starter,199,5,60,3,6,Active,North America,2023-10-25
ACC-5018,Starlight Studios,Pro,1500,45,590,11,1,Churned,North America,2022-07-08
ACC-5019,Quantum Genomics,Enterprise,6100,190,2250,1,9,Active,Europe,2021-08-19
ACC-5020,Aero Dynamics,Enterprise,5400,175,2050,3,8,Active,Asia-Pacific,2022-02-11`;

export const SUPPLY_CHAIN_CSV = `Shipment_ID,Origin_Warehouse,Destination_Hub,Carrier,Lead_Time_Days,Shipping_Cost,On_Time_Delivery,Defect_Rate_Pct,Shipment_Status
SHP-8001,Seattle WA,Dallas TX,FedEx Express,2,380.50,Yes,0.02,Delivered
SHP-8002,Chicago IL,Atlanta GA,UPS Ground,4,210.00,Yes,0.01,Delivered
SHP-8003,Newark NJ,Miami FL,DHL Global,3,320.00,No,0.05,Delayed
SHP-8004,Los Angeles CA,Denver CO,FedEx Ground,3,240.00,Yes,0.00,Delivered
SHP-8005,Dallas TX,Chicago IL,Freightline Corp,5,590.00,No,0.08,Delayed
SHP-8006,Seattle WA,Phoenix AZ,UPS Ground,3,195.00,Yes,0.01,Delivered
SHP-8007,Newark NJ,Boston MA,FedEx Express,1,280.00,Yes,0.00,Delivered
SHP-8008,Chicago IL,Minneapolis MN,UPS Ground,2,165.00,Yes,0.02,Delivered
SHP-8009,Los Angeles CA,Seattle WA,DHL Global,4,410.00,No,0.06,In Transit
SHP-8010,Atlanta GA,Charlotte NC,Freightline Corp,2,185.00,Yes,0.01,Delivered
SHP-8011,Dallas TX,Houston TX,FedEx Ground,1,120.00,Yes,0.00,Delivered
SHP-8012,Seattle WA,San Francisco CA,UPS Ground,3,230.00,Yes,0.03,Delivered
SHP-8013,Newark NJ,Philadelphia PA,FedEx Express,1,190.00,Yes,0.00,Delivered
SHP-8014,Chicago IL,Detroit MI,Freightline Corp,3,340.00,No,0.07,Delayed
SHP-8015,Los Angeles CA,Las Vegas NV,UPS Ground,1,145.00,Yes,0.01,Delivered`;

export async function loadDefaultSampleDataset(): Promise<Dataset> {
  return await parseCSVString(ECOMMERCE_SALES_CSV, 'global_ecommerce_sales.csv');
}

export async function loadSampleDataset(type: 'ecommerce' | 'saas' | 'supply_chain'): Promise<Dataset> {
  if (type === 'saas') {
    return await parseCSVString(SAAS_CHURN_CSV, 'saas_churn_analytics.csv');
  }
  if (type === 'supply_chain') {
    return await parseCSVString(SUPPLY_CHAIN_CSV, 'supply_chain_logistics.csv');
  }
  return await parseCSVString(ECOMMERCE_SALES_CSV, 'global_ecommerce_sales.csv');
}
