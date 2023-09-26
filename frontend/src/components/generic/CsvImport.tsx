import { Box, Button, MenuItem, Step, StepButton, Stepper, Table, TableCell, TableBody, TableHead, TableRow, Typography, TextField, Stack, Alert } from "@mui/material";
import React, {useEffect, useState} from "react";
import Papa from "papaparse";
import { camelToTitleCase } from "../../utils/helpers";

export type CsvColumn<T> = {
    name: (keyof T), 
    label: string, 
    // isOptional: boolean, // Not enforced on this side
};

export type CsvRowValidationResult = {
        isValid: true;
    } | {
        isValid: false;
        allowIgnore?: boolean; // whether this is just a warning, or allow to proceed without this row. Default false
        message?: string;
    }

type ValidationRowEntry = {
    rowIndex: number, 
    message?: string
}

export type CsvImportProps<T> = {
    columns: CsvColumn<T>[];
    onImport: (objects: T[]) => void;
    onCancel?: () => void;
    validateRow?: (rowObject: T) => CsvRowValidationResult; // ran for each row, telling us what's right and what isn't
    trimSpaces?: boolean, // trim spaces on all input data
    columnAutoMatchMethod?: 'name' | 'label' | 'name-label' | null, // Should we use column name, column label, both or none to auto match columns 
}

export default function CsvImport<T>(props: CsvImportProps<T>) {

    const {
        columns, 
        onImport, 
        trimSpaces = false,
        onCancel = null,
        validateRow = null,
        columnAutoMatchMethod = null,
    } = props;

    const [currentStepNum, setCurrentStepNum] = useState<number>(0);
    const steps = [
        'Upload File',
        'Select Columns',
        'Review',
    ] as const;

     // State to store parsed data
    const [parsedData, setParsedData] = useState([]);

    //State to store table Column name
    const [tableRows, setTableRows] = useState<string[]>([]);

    //State to store the values
    const [values, setValues] = useState<string[][]>([]);

    const [colMapping, setColMapping] = useState<{[k: string]: T | null }>({});

    const [hasFileUploadError, setHasFileUploadError] = useState(false);

    const [processedResult, setProcessedResult] = useState<T[] | null>(null);

    const [validationErrors, setValidationErrors] = useState<{errorRows: ValidationRowEntry[], warningRows: ValidationRowEntry[]} | null>(null);

    const handleFile = (event: any) => {
        const file = event.target.files[0];
        
        if(!file.type.endsWith('/csv') && !file.name.endsWith('.csv'))  {
            setHasFileUploadError(true);
            return;
        }

        setHasFileUploadError(false);


        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                const rowsArray: string[][] = [];
                const valuesArray: string[][] = [];

                // Iterating data to get column name and their values
                results.data.map((d) => {
                    // @ts-ignore
                    rowsArray.push(Object.keys(d));
                    // @ts-ignore
                    valuesArray.push(Object.values(d));
                });

                // Parsed Data Response in array format
                setParsedData(results.data as any);

                // Filtered Column Names
                // @ts-ignore
                setTableRows(rowsArray[0]);

                // Filtered Values
                // @ts-ignore
                setValues(valuesArray);

                setCurrentStepNum(currentStepNum + 1);
                
                if(Object.keys(colMapping).length === 0 && columnAutoMatchMethod !== null){
                    try {
                        const newMapping = Object.fromEntries(rowsArray[0].map(headerCell => {
                            const foundCol = columns.find((col) => {
                                const nameMatch = camelToTitleCase(col.name as string) === camelToTitleCase(headerCell);
                                const labelMatch = camelToTitleCase(col.label as string) === camelToTitleCase(headerCell);

                                if(columnAutoMatchMethod === 'name-label') {
                                    return nameMatch || labelMatch;
                                }
                                else {
                                    return columnAutoMatchMethod === 'name' ? nameMatch : labelMatch;
                                }
                                
                            });
                            return [headerCell, foundCol?.name ?? null]
                        }));
                        // @ts-ignore
                        newMapping && setColMapping(newMapping);
                    }
                    catch(e: any) {

                    }
                }

                // onImport?.(processedResult);
            },
            error: (error, file) => {
                console.error(error, file)
            }
        });
    };
    
    useEffect( () => {
        const processedResult = parsedData.map(valsRow => {
            const resultRowEntries = Object.entries(colMapping).filter(([srcCol, tgtCol]) => !!tgtCol).map(([srcCol, tgtCol]) => {
                let val = (valsRow?.[srcCol] ?? null) as string|null;
                if(val && trimSpaces) {
                    // if(val !== val?.trim()) {
                    //     console.log('trim taking place on', val, `with result '${val?.trim()}'`, )
                    // }
                    val = val?.trim();
                }
                return [tgtCol, val]
            }).filter(x => x!==null);
            return Object.fromEntries(resultRowEntries) as T;  
        });

        const errorRows: ValidationRowEntry[] = [];
        const warningRows: ValidationRowEntry[] = [];

        // Run validation logic, if applicable
        const finalProcessedResult = validateRow ? processedResult.map((valsRow, i) => {
            const validateResult = validateRow(valsRow);
            // Return verbatim if valid
            if(!validateResult.isValid) {
                const message = validateResult.message;
                (validateResult?.allowIgnore ? warningRows : errorRows).push(message ? {rowIndex: i, message} : {rowIndex: i});
            }
            // Always return the row, since we want to show the user the data with errors
            // However, we need to do filtration in the next step
            return valsRow;
        }).filter(valsRow => valsRow !== null) as T[] : processedResult;

        setValidationErrors((errorRows.length > 0 || warningRows.length > 0) ? {errorRows, warningRows} : null);
        setProcessedResult(finalProcessedResult);

    }, [parsedData, colMapping]);

    const processedCols = (processedResult && processedResult[0]) ? Object.keys(processedResult[0]) : null;

    const cancelBtn = onCancel && <Button variant="contained" color="secondary" onClick={() => onCancel?.()}>Cancel</Button>;

    
    // If we have any warnings, we need to remove them from the final result that will be submitted
    // Otherwise, we just forward the processed result
    // This is the entry that'll be used for submissions
    const validatedResult = (validateRow && processedResult && validationErrors?.warningRows && validationErrors?.warningRows?.length > 0) ? processedResult.filter((valsRow, i) => validateRow(valsRow)?.isValid) : (processedResult ?? []);
    
    // If we have nothing in the result, this is also a fatal error
    const hasFatalErrors = hasFileUploadError || (validationErrors?.errorRows && validationErrors?.errorRows?.length > 0) || validatedResult.length === 0;

    return <Box>
        <Stepper nonLinear activeStep={currentStepNum} sx={{mb: 3}}>
            {steps.map((label, index) => (
                <Step key={label} completed={index < currentStepNum}>
                    <StepButton color="inherit" onClick={() => (index < currentStepNum) && setCurrentStepNum(index)}>{label}</StepButton>
                </Step>
            ))}
        </Stepper>
        
        {steps[currentStepNum] === 'Upload File' && <Box>
            {/* <Typography>{steps[currentStepNum]}</Typography> */}
            <Stack direction={'row'} spacing={2} alignItems={'baseline'}>
                <Button variant="contained" component="label">
                    Upload File
                    <input type="file" hidden onChange={handleFile} accept=".csv" />
                </Button>
                {cancelBtn}
            </Stack>
            {hasFileUploadError && <Alert severity="error" sx={{mt: 2}}>The uploaded file is not a valid CSV. Please upload a valid CSV file.</Alert>}
        </Box>} 

        {steps[currentStepNum] === 'Select Columns' && <Box>
            <Typography>{steps[currentStepNum]}</Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        {tableRows.map((headerCell, i) => {
                            
                            return <TableCell key={i}>
                                <TextField select value={colMapping?.[headerCell] ?? "unassigned"} onChange={(e) => setColMapping({...colMapping, [headerCell]: (e.target.value !== 'unassigned') ? (e.target.value as unknown as T) : null})}>
                                    <MenuItem key={i} value="unassigned">Unassigned</MenuItem>
                                    {columns.map((col, j) => <MenuItem key={j} value={col.name as string}>{col.label}</MenuItem>)}
                                </TextField>
                            </TableCell>
                        })}
                    </TableRow>
                    <TableRow>
                        {tableRows.map((headerCell, i) => {
                            return <TableCell key={i}>{headerCell}</TableCell>;
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {values.map((valuesRow, i) => <TableRow key={i}>
                        {valuesRow.map((valuesCell, j) => <TableCell key={j}>{valuesCell}</TableCell>)}
                    </TableRow>)}
                </TableBody>
            </Table>
            <Stack direction={'row'} spacing={2} alignItems={'baseline'}>
                <Button variant="contained" onClick={() => setCurrentStepNum(currentStepNum - 1)}>Back</Button>
                <Button variant="contained" onClick={() => setCurrentStepNum(currentStepNum + 1)}>Next</Button>
                {cancelBtn}
            </Stack>
        </Box>} 
        {steps[currentStepNum] === 'Review' && processedCols && processedResult && <Box>
            <Typography>{steps[currentStepNum]}</Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        {processedCols.map((headerCell, i) => 
                            <TableCell key={i}>{headerCell}</TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {processedResult.map((element, i) => {
                        const rowError = validationErrors?.errorRows?.filter(({rowIndex}) => rowIndex === i)?.[0];
                        const rowWarning = validationErrors?.warningRows?.filter(({rowIndex}) => rowIndex === i)?.[0];
                        const errorSx = (rowError || rowWarning) ? {backgroundColor: '#fcc'} : {}

                        const errorMessage = (rowError ? rowError.message : rowWarning?.message) ?? 'Error on this row.';
                        return <React.Fragment key={i}>
                                <TableRow>
                                    {processedCols.map(col => <TableCell key={col} sx={errorSx}>{(element as any)?.[col]}</TableCell>)}
                                </TableRow>
                                {(rowError || rowWarning) && <TableRow>
                                    <TableCell colSpan={processedCols.length}>
                                        <Alert severity={rowError ? 'error' : 'warning'}>{errorMessage}</Alert>
                                    </TableCell>
                                </TableRow>}
                        </React.Fragment>
                        }
                    )}
                </TableBody>
            </Table>
            
            {hasFatalErrors && <Alert sx={{my: 2}} severity="error">This CSV has errors, unable to proceed.</Alert>}
            <Stack direction={'row'} spacing={2} alignItems={'baseline'}>
                {hasFatalErrors && <Button variant="contained" onClick={() => setCurrentStepNum(0)}>Upload a different CSV</Button>}
                <Button variant="contained" onClick={() => setCurrentStepNum(currentStepNum - 1)}>Back</Button>
                <Button variant="contained" onClick={() => onImport?.(validatedResult)} disabled={hasFatalErrors}>Finish</Button>
                {cancelBtn}
            </Stack>
        </Box>}
    </Box>
}