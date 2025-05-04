using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using erpsystem.Server.Models;

namespace erpsystem.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<WarehouseItem> WarehouseItems { get; set; }
        public DbSet<WarehouseMovements> WarehouseMovements { get; set; }
        public DbSet<Contractor> Contractors { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<OrderHistory> OrderHistory { get; set; }
        public DbSet<OperationLog> OperationLogs { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<Location> Locations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Location>().HasData(
                new Location { Id = 1, Name = "Regał A1", Type = "Magazyn Główny" },
                new Location { Id = 2, Name = "Regał B2", Type = "Magazyn Główny" },
                new Location { Id = 3, Name = "Regał C3", Type = "Magazyn Główny" },
                new Location { Id = 4, Name = "Regał D4", Type = "Magazyn Główny" },
                new Location { Id = 5, Name = "Regał E5", Type = "Magazyn Główny" }
            );
        }
    }
}