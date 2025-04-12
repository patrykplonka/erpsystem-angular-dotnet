using erpsystem.Server.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace erpsystem.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {

        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }
        public DbSet<WarehouseItem> WarehouseItems { get; set; }
        public DbSet<WarehouseMovements> WarehouseMovements { get; set; }
        public DbSet<OperationLog> OperationLogs { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Contractor> Contractors { get; set; }
    }
}
