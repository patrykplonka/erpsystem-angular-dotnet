# ERP System - Engineering Thesis

## Overview
This ERP system is being developed as part of my engineering thesis. It is designed to manage warehouse operations, invoices, and customers efficiently using modern web technologies. The project is currently under development.

## Technologies Used
- **Backend:** ASP.NET Core, Entity Framework Core, SignalR
- **Frontend:** Angular, 
- **Database:** MS SQL Server
- **Other Features:**
  - Real-time inventory tracking with SignalR
  - Role-based access control (Admin, Warehouse Worker, Owner)
  - PDF invoice generation
  - Employee communication via chat (SignalR)
  - Report export to Excel using EPPlus

## Features (Planned)
- **Authentication & Authorization:** Secure login and role management.
- **Warehouse Management:** Track inventory, add/update/delete stock.
- **Invoice Management:** Generate and download PDF invoices.
- **Customer Management:** Store customer data and transaction history.
- **Reports & Analytics:** Generate sales and inventory reports.
- **Real-time Updates:** Live inventory changes and notifications using SignalR.
- **Employee Chat:** Internal communication system for employees.

## Installation
1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-repo/erp-system.git
   ```
2. **Backend Setup:**
   - Install .NET SDK
   - Configure MS SQL Server and update the connection string
   - Apply migrations and seed the database
   ```sh
   dotnet ef database update
   ```
   - Run the backend
   ```sh
   dotnet run
   ```
3. **Frontend Setup:**
   - Install Node.js and Angular CLI
   - Navigate to the frontend folder and install dependencies
   ```sh
   npm install
   ```
   - Run the Angular application
   ```sh
   ng serve
   ```

## Development Status
🚧 **This project is currently under development.** New features are being added progressively.

## Contribution
Since this is an academic project, external contributions are not currently accepted. However, suggestions and feedback are welcome!

## License
This project is developed as part of an engineering thesis and is not intended for commercial use at this stage.

---
**Author:** Patryk Płonka


