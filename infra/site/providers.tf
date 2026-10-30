provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project = var.project
    }
  }
}

# Proveedor reservado para recursos que exigen us-east-1 (como certificados ACM para CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project = var.project
    }
  }
}
