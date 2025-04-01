using Microsoft.AspNetCore.Identity;

namespace erpsystem.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public int RoleId { get; set; } // Dodaj RoleId
        public DateTime CreatedAt { get; set; } // Dodaj CreatedAt
        public UserStatus Status { get; set; } // Dodaj Status
    }

    public enum UserStatus // Zdefiniuj enum UserStatus
    {
        Active,
        Inactive,
        Suspended
    }
}