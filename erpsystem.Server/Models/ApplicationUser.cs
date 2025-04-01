using Microsoft.AspNetCore.Identity;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Data;

namespace erpsystem.Server.Models
{
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; }

        [Required]
        [MaxLength(50)]
        public string LastName { get; set; }

        [Required]
        [MaxLength(100)]
        public override string Email { get; set; } 

        [Required]
        public string PasswordHash { get; set; } 

        [ForeignKey("Role")]
        public int RoleId { get; set; }
        public virtual Role Role { get; set; } 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public UserStatus Status { get; set; } = UserStatus.Active;
    }

    public enum UserStatus
    {
        Active,
        Blocked,
        Inactive
    }
}
