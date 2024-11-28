// import type { DepartmentInterface } from "../utils/types";

export default class DepartmentController {
  private request: Request;
  private path: string;

  constructor(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    this.request = request;
    this.path = path;
  }

  /**
   * Retrieve all Department
   * @param param0 page
   * @param param1 search_term
   * @param param2 limit
   * @returns {departments: DepartmentInterface, totalPages: number}
   */
  public async getDepartments({
    page,
    search_term,
    limit = 10,
  }: {
    page: number;
    search_term?: string;
    limit?: number;
  }): Promise<
    { departments: DepartmentInterface[]; totalPages: number } | any
  > {
    try {
      const skipCount = (page - 1) * limit;

      const buildRegex = (term: string) =>
        new RegExp(
          term
            .split(' ')
            .map((word) => `(?=.*${word})`)
            .join(''),
          'i',
        );
      const searchFilter = search_term
        ? {
            $or: [
              { name: buildRegex(search_term) },
              { description: buildRegex(search_term) },
            ],
          }
        : {};

      const [departments, totalDepartmentsCount] = await Promise.all([
        Department.find(searchFilter)
          .skip(skipCount)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        Department.countDocuments(searchFilter).exec(),
      ]);

      const totalPages = Math.ceil(totalDepartmentsCount / limit);
      return { departments, totalPages };
    } catch (error) {
      console.log(error);
      return {
        status: 'error',
        code: 400,
        message: 'Error fetching departments',
        errors: [],
      };
    }
  }

  /**
   * Retrieve a single Department
   * @param id string
   * @returns DepartmentInterface
   */
  public async getDepartment(id: string) {
    try {
      const department = await Department.findById(id);

      if (!department) {
        return {
          status: 'error',
          code: 400,
          message: 'Department not found!',
          errors: [],
        };
      }

      return {
        status: 'success',
        code: 200,
        message: 'User retrieved successfully!',
        data: department,
      };
    } catch (error) {
      console.error('Error retrieving department:', error);
      return {
        status: 'error',
        code: 400,
        message: 'Error fetching department',
        errors: [],
      };
    }
  }

  /**
   * Create a new department
   * @param path string
   * @param name string
   * @param description string
   * @returns DepartmentInterface
   */
  public createDepartment = async ({
    name,
    phone,
    description,
  }: {
    name: string;
    phone: string;
    description: string;
  }) => {
    // const session = await getFlashSession(this.request.headers.get("Cookie"));

    try {
      const existingDepartment = await Department.findOne({ name });

      if (existingDepartment) {
        return {
          status: 'error',
          code: 400,
          message: 'Department already exists',
          errors: [
            {
              field: 'name',
              message:
                'A department with this name already exists. Please choose a different name.',
            },
          ],
        };
      }

      const department = await Department.create({
        name,
        phone,
        description,
      });

      if (!department) {
        return {
          status: 'error',
          code: 400,
          message: 'Error adding department',
          errors: [
            {
              field: 'name',
              message: 'Error adding department',
            },
          ],
        };
      }

      return {
        status: 'success',
        code: 200,
        message: 'Department added successfully',
        data: department,
      };
    } catch (error) {
      console.log(error);

      return {
        status: 'error',
        code: 400,
        message: 'Error adding department',
      };
    }
  };

  /**
   * Update department
   * @param param0 _id
   * @param param1 name
   * @param param3 description
   * @returns null
   */
  public updateDepartment = async ({
    _id,
    name,
    phone,
    description,
  }: {
    _id: string;
    name: string;
    phone: string;
    description: string;
  }) => {
    // const session = await getFlashSession(this.request.headers.get("Cookie"));

    try {
      // Check for unique phone number
      if (name) {
        const nameExist = await Department.findOne({
          name: name,
          _id: { $ne: _id },
        });
        if (nameExist) {
          return {
            status: 'error',
            code: 400,
            message: 'Department already exists',
            errors: [
              {
                field: 'name',
                message: 'Name number already in use',
              },
            ],
          };
        }
      }

      const updated = await Department.findByIdAndUpdate(
        _id,
        {
          name,
          phone,
          description,
        },
        { new: true },
      );

      return {
        status: 'success',
        code: 200,
        message: 'Department updated successfully',
        data: updated,
      };
    } catch (error) {
      return {
        status: 'error',
        code: 400,
        message: 'Error updating department',
      };
    }
  };

  /**
   * Delete Department
   * @param param0 _id
   * @returns null
   */
  public deleteDepartment = async (_id: string) => {
    // const session = await getFlashSession(this.request.headers.get("Cookie"));

    try {
      await Department.findByIdAndDelete(_id);

      return {
        status: 'success',
        code: 200,
        message: 'Department deleted successfully',
      };
    } catch (error) {
      console.log(error);

      return {
        status: 'error',
        code: 400,
        message: 'Error deleting department',
      };
    }
  };
}
