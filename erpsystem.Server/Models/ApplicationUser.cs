using Microsoft.AspNetCore.Identity;

namespace erpsystem.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public int RoleId { get; set; } 
        public DateTime CreatedAt { get; set; } 
        public UserStatus Status { get; set; } 
    }

    public enum UserStatus 
    {
        Active,
        Inactive,
        Suspended
    }
}